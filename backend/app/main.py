"""FastAPI backend for the ML-DSA (FIPS 204) demo.

Resource-oriented API (no verbs in URIs), RFC 7807 problem+json errors.
Sizes/timings returned by this API are measured at runtime; Table 2 values are
sent separately as `standard_reference` so the UI can show "measured == spec".
"""
from __future__ import annotations

import logging
import os
import time
from collections import deque
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app import crypto_service as cs

logger = logging.getLogger("mldsa.demo")

app = FastAPI(
    title="ML-DSA Demo API",
    version="1.0.0",
    description="Demo chữ ký số ML-DSA theo NIST FIPS 204 + đối chiếu Ed25519/RSA.",
)

# --- Request guards (security-review §5/§7) ----------------------------------
# The API is deliberately unauthenticated (local demo), so the guards are
# header-only and cheap: JSON media type only, a 1.5 MiB Content-Length cap
# checked before the body is read, and a per-IP sliding window (set
# RATE_LIMIT_PER_MINUTE=0 to disable). CORS is registered AFTER the guard
# middleware below so it is the OUTERMOST layer and wraps guard replies too.


class SlidingWindowRateLimiter:
    def __init__(self, limit: int, window_seconds: float = 60.0):
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = {}

    def check(self, key: str) -> bool:
        """Return True if this request is allowed, recording it."""
        if self.limit <= 0:
            return True
        now = time.monotonic()
        hits = self._hits.setdefault(key, deque())
        while hits and now - hits[0] >= self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()


limiter = SlidingWindowRateLimiter(
    int(os.environ.get("RATE_LIMIT_PER_MINUTE", "600"))
)


# Headers attached to EVERY response (security-review §5):
# - nosniff: JSON can never be MIME-sniffed into executable content.
# - no-store: secret keys / signatures never sit in a shared cache.
# - empty CSP: a problem+json document opened directly in a tab can render or
#   execute nothing — the injection/backdoor surface is closed at the source.
API_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Cache-Control": "no-store",
    "Content-Security-Policy": (
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; "
        "form-action 'none'"
    ),
}

# 1 MiB message -> 1,398,104 base64 chars + JSON envelope + key fields
# ~= 1.45 MB, so 1.5 MiB admits every legitimate body while the Content-Length
# HEADER check below refuses bigger ones before a single body byte is read
# into memory (memory-exhaustion guard).
MAX_REQUEST_BYTES = 1_572_864  # 1.5 MiB


def _problem(status: int, title: str, detail: str) -> JSONResponse:
    """RFC 7807 reply that already carries the security headers."""
    return JSONResponse(
        status_code=status,
        media_type="application/problem+json",
        content={
            "type": "about:blank",
            "title": title,
            "status": status,
            "detail": detail,
        },
        headers=API_SECURITY_HEADERS,
    )


@app.middleware("http")
async def request_guards(request: Request, call_next):
    if request.method == "POST" and request.url.path.startswith("/api/"):
        # 1) Media type: JSON only. multipart/form-data, XML, urlencoded and
        #    friends are refused BEFORE any parsing — there is no upload
        #    endpoint and nothing will ever parse attacker-chosen formats.
        media = request.headers.get("content-type", "")
        if not media.lower().startswith("application/json"):
            return _problem(
                415,
                "Unsupported media type",
                "This API accepts application/json bodies only. File uploads "
                "are processed in the browser and never stored server-side.",
            )
        # 2) Declared size on the header, before the body is read.
        length = request.headers.get("content-length")
        if length is None or not length.isdigit():
            return _problem(
                400, "Malformed request", "Missing or invalid Content-Length."
            )
        if int(length) > MAX_REQUEST_BYTES:
            return _problem(
                413,
                "Request body too large",
                f"Limit is {MAX_REQUEST_BYTES} bytes; messages themselves "
                "cap at 1 MiB.",
            )
        # 3) Per-IP sliding window (limit=0 disables).
        client = request.client.host if request.client else "unknown"
        if not limiter.check(client):
            return _problem(
                429,
                "Too many requests",
                f"Rate limit exceeded: {limiter.limit} POSTs per minute "
                "per client. Set RATE_LIMIT_PER_MINUTE to adjust.",
            )
    response = await call_next(request)
    for key, value in API_SECURITY_HEADERS.items():
        response.headers.setdefault(key, value)
    return response


# Registered LAST -> OUTERMOST middleware: guard replies (400/413/415/429)
# also get CORS headers, so the browser surfaces the real problem+json status
# instead of masking it as an opaque network error. Local demo origins only.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# --- RFC 7807 error handling -------------------------------------------------


@app.exception_handler(cs.ParamSetError)
async def param_set_handler(_: Request, exc: cs.ParamSetError):
    return JSONResponse(
        status_code=422,
        media_type="application/problem+json",
        content={
            "type": "about:blank",
            "title": "Unknown parameter set",
            "status": 422,
            "detail": str(exc),
        },
    )


@app.exception_handler(cs.MessageTooLargeError)
async def message_too_large_handler(_: Request, exc: cs.MessageTooLargeError):
    return JSONResponse(
        status_code=413,
        media_type="application/problem+json",
        content={
            "type": "about:blank",
            "title": "Message too large",
            "status": 413,
            "detail": str(exc),
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        media_type="application/problem+json",
        content={
            "type": "about:blank",
            "title": "Validation error",
            "status": 422,
            "detail": "Request body failed validation",
            "errors": [
                {"field": ".".join(str(p) for p in e["loc"]), "message": e["msg"]}
                for e in exc.errors()
            ],
        },
    )


@app.exception_handler(ValueError)
async def value_error_handler(_: Request, exc: ValueError):
    return JSONResponse(
        status_code=422,
        media_type="application/problem+json",
        content={
            "type": "about:blank",
            "title": "Invalid input",
            "status": 422,
            "detail": str(exc),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Last-resort handler: log the traceback server-side, never to the client."""
    logger.error(
        "Unhandled error on %s %s", request.method, request.url.path, exc_info=exc
    )
    return JSONResponse(
        status_code=500,
        media_type="application/problem+json",
        content={
            "type": "about:blank",
            "title": "Internal server error",
            "status": 500,
            "detail": "An unexpected error occurred. Details are logged server-side only.",
        },
    )


# --- Schemas -----------------------------------------------------------------

ParamSetName = Literal["ML-DSA-44", "ML-DSA-65", "ML-DSA-87"]
ClassicalName = Literal["Ed25519", "RSA-2048"]


class KeygenRequest(BaseModel):
    param_set: ParamSetName = Field(default="ML-DSA-65")


class SignRequest(BaseModel):
    param_set: ParamSetName
    secret_key: str = Field(description="Base64-encoded secret key")
    message: str = Field(description="Message text (utf8) or file bytes (base64)")
    message_encoding: Literal["utf8", "base64"] = Field(
        default="utf8",
        description="How to decode `message`. base64 = raw file bytes, unmodified.",
    )


class VerifyRequest(BaseModel):
    param_set: ParamSetName
    public_key: str = Field(description="Base64-encoded public key")
    message: str = Field(description="Message text (utf8) or file bytes (base64)")
    signature: str = Field(description="Base64-encoded signature")
    message_encoding: Literal["utf8", "base64"] = Field(default="utf8")


class BenchmarkRequest(BaseModel):
    message: str = Field(default="ML-DSA benchmark message", max_length=4096)
    iterations: int = Field(default=20, ge=1, le=200)


# --- Endpoints ----------------------------------------------------------------


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/params")
def params():
    """Parameter sets with Table 2 reference sizes (FIPS 204 p.16)."""
    return {
        "param_sets": [
            {
                "name": name,
                "security_category": data["security_category"],
                "standard_reference": {
                    "public_key_bytes": data["public_key_bytes"],
                    "secret_key_bytes": data["secret_key_bytes"],
                    "signature_bytes": data["signature_bytes"],
                    "source": "FIPS 204 Table 2, p.16",
                },
            }
            for name, data in cs.PARAM_SETS.items()
        ],
        "classical": [
            {"name": "Ed25519", "source": "RFC 8032"},
            {"name": "RSA-2048", "source": "FIPS 186-5 / PKCS#1 v1.5"},
        ],
        "max_message_bytes": cs.MAX_MESSAGE_BYTES,
    }


@app.post("/api/keys")
def create_key(req: KeygenRequest):
    timed = cs.keygen(req.param_set)
    public_key, secret_key = timed.value
    return {
        "param_set": req.param_set,
        "public_key": _b64(public_key),
        "secret_key": _b64(secret_key),
        "measured": {
            "public_key_bytes": len(public_key),
            "secret_key_bytes": len(secret_key),
        },
        "keygen_ms": round(timed.ms, 3),
    }


def _decode_message(message: str, encoding: str) -> bytes:
    """utf8 -> text encoded; base64 -> raw bytes (files), validated strictly."""
    if encoding == "base64":
        return _unb64(message)
    return message.encode("utf-8")


@app.post("/api/signatures")
def create_signature(req: SignRequest):
    message = _decode_message(req.message, req.message_encoding)
    secret_key = _unb64(req.secret_key)
    timed = cs.sign(req.param_set, secret_key, message)
    return {
        "param_set": req.param_set,
        "signature": _b64(timed.value),
        "measured": {"signature_bytes": len(timed.value)},
        "message_bytes": len(message),
        "message_encoding": req.message_encoding,
        "sign_ms": round(timed.ms, 3),
    }


@app.post("/api/verifications")
def verify_signature(req: VerifyRequest):
    message = _decode_message(req.message, req.message_encoding)
    public_key = _unb64(req.public_key)
    signature = _unb64(req.signature)
    timed = cs.verify(req.param_set, public_key, message, signature)
    return {
        "param_set": req.param_set,
        "valid": timed.value,
        "verify_ms": round(timed.ms, 3),
        # Explains WHY false for the UI: length mismatch vs cryptographic failure.
        "note": (
            "true = signature valid"
            if timed.value
            else "false = wrong length (FIPS 204 Sec. 3.6.2), wrong key, "
                 "tampered message, or tampered signature"
        ),
    }


@app.post("/api/benchmarks")
def benchmark(req: BenchmarkRequest):
    """Measure keygen/sign/verify across ML-DSA parameter sets and classical
    algorithms. Every number is measured in this process — nothing is hardcoded."""
    message = req.message.encode("utf-8")
    results = []

    for name in cs.PARAM_SET_NAMES:
        kg = cs.keygen(name)
        public_key, secret_key = kg.value
        sign_ms, verify_ms, verify_ok = [], [], True
        signature_bytes = 0
        for _ in range(req.iterations):
            st = cs.sign(name, secret_key, message)
            signature_bytes = len(st.value)
            sign_ms.append(st.ms)
            vt = cs.verify(name, public_key, message, st.value)
            verify_ms.append(vt.ms)
            verify_ok = verify_ok and vt.value
        data = cs.PARAM_SETS[name]
        results.append(
            {
                "algorithm": name,
                "kind": "post-quantum",
                "security_category": data["security_category"],
                "public_key_bytes": len(public_key),
                "secret_key_bytes": len(secret_key),
                "signature_bytes": signature_bytes,
                "standard_reference": {
                    "public_key_bytes": data["public_key_bytes"],
                    "secret_key_bytes": data["secret_key_bytes"],
                    "signature_bytes": data["signature_bytes"],
                },
                "keygen_ms": round(kg.ms, 3),
                "sign_ms_avg": round(_avg(sign_ms), 3),
                "verify_ms_avg": round(_avg(verify_ms), 3),
                "roundtrip_ok": verify_ok,
            }
        )

    for name in ("Ed25519", "RSA-2048"):
        kg = cs.classical_keygen(name)
        key = kg.value
        public_key = key.public_key()
        sizes = cs.classical_sizes(name, key)
        sign_ms, verify_ms, verify_ok = [], [], True
        for _ in range(req.iterations):
            st = cs.classical_sign(name, key, message)
            sign_ms.append(st.ms)
            vt = cs.classical_verify(name, public_key, message, st.value)
            verify_ms.append(vt.ms)
            verify_ok = verify_ok and vt.value
        results.append(
            {
                "algorithm": name,
                "kind": "classical",
                "security_category": None,
                **sizes,
                "standard_reference": sizes,
                "keygen_ms": round(kg.ms, 3),
                "sign_ms_avg": round(_avg(sign_ms), 3),
                "verify_ms_avg": round(_avg(verify_ms), 3),
                "roundtrip_ok": verify_ok,
            }
        )

    return {
        "message_bytes": len(message),
        "iterations": req.iterations,
        "results": results,
        "measured_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }


def _b64(data: bytes) -> str:
    import base64

    return base64.b64encode(data).decode("ascii")


def _unb64(data: str) -> bytes:
    import base64

    try:
        return base64.b64decode(data, validate=True)
    except Exception as exc:
        raise ValueError(f"Invalid base64 input: {exc}") from None


def _avg(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0
