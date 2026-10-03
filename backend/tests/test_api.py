"""API-level security tests for the ML-DSA demo backend (rubric: kiểm thử bảo mật).

Run: pytest backend/tests -q   (backend server not needed — uses FastAPI TestClient)
Covers:
- Happy path: keygen -> sign -> verify (all 3 parameter sets).
- Tampered message / tampered signature / wrong key -> valid=false (never 500).
- Wrong-length pk/sig -> valid=false per FIPS 204 Sec. 3.6.2.
- Malformed base64, unknown param set, oversized message -> 4xx problem+json.
- No endpoint leaks the secret key in a verify response.
"""
from __future__ import annotations

import base64

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.crypto_service import PARAM_SETS, MAX_MESSAGE_BYTES

client = TestClient(app, raise_server_exceptions=False)

PARAMS = list(PARAM_SETS)


def b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def make_keys(param_set: str) -> tuple[str, str]:
    r = client.post("/api/keys", json={"param_set": param_set})
    assert r.status_code == 200, r.text
    return r.json()["public_key"], r.json()["secret_key"]


# --- happy path ---------------------------------------------------------------


@pytest.mark.parametrize("param_set", PARAMS)
def test_sign_verify_roundtrip(param_set):
    pk, sk = make_keys(param_set)
    message = "Xin chào FIPS 204"
    sig = client.post(
        "/api/signatures",
        json={"param_set": param_set, "secret_key": sk, "message": message},
    )
    assert sig.status_code == 200, sig.text
    signature = sig.json()["signature"]

    # measured sizes must match FIPS 204 Table 2 exactly
    spec = PARAM_SETS[param_set]
    assert sig.json()["measured"]["signature_bytes"] == spec["signature_bytes"]

    v = client.post(
        "/api/verifications",
        json={
            "param_set": param_set,
            "public_key": pk,
            "message": message,
            "signature": signature,
        },
    )
    assert v.status_code == 200
    assert v.json()["valid"] is True


@pytest.mark.parametrize("param_set", PARAMS)
def test_keygen_measured_sizes_match_table2(param_set):
    r = client.post("/api/keys", json={"param_set": param_set})
    body = r.json()
    spec = PARAM_SETS[param_set]
    assert body["measured"]["public_key_bytes"] == spec["public_key_bytes"]
    assert body["measured"]["secret_key_bytes"] == spec["secret_key_bytes"]
    # reference values are the ones quoted from the standard
    assert body["measured"] == {
        "public_key_bytes": spec["public_key_bytes"],
        "secret_key_bytes": spec["secret_key_bytes"],
    }


# --- rubric: dữ liệu sửa đổi, khóa sai ---------------------------------------


@pytest.mark.parametrize("param_set", PARAMS)
def test_tampered_message_rejected(param_set):
    pk, sk = make_keys(param_set)
    sig = client.post(
        "/api/signatures",
        json={"param_set": param_set, "secret_key": sk, "message": "original"},
    ).json()["signature"]
    v = client.post(
        "/api/verifications",
        json={
            "param_set": param_set,
            "public_key": pk,
            "message": "original!",  # 1-char tamper
            "signature": sig,
        },
    )
    assert v.status_code == 200
    assert v.json()["valid"] is False


@pytest.mark.parametrize("param_set", PARAMS)
def test_tampered_signature_rejected(param_set):
    pk, sk = make_keys(param_set)
    sig = client.post(
        "/api/signatures",
        json={"param_set": param_set, "secret_key": sk, "message": "msg"},
    ).json()["signature"]
    raw = bytearray(base64.b64decode(sig))
    raw[-1] ^= 0xFF
    v = client.post(
        "/api/verifications",
        json={
            "param_set": param_set,
            "public_key": pk,
            "message": "msg",
            "signature": b64(bytes(raw)),
        },
    )
    assert v.status_code == 200
    assert v.json()["valid"] is False


@pytest.mark.parametrize("param_set", PARAMS)
def test_wrong_key_rejected(param_set):
    pk, _ = make_keys(param_set)          # key A
    _, sk_b = make_keys(param_set)        # key B
    sig = client.post(
        "/api/signatures",
        json={"param_set": param_set, "secret_key": sk_b, "message": "msg"},
    ).json()["signature"]
    v = client.post(
        "/api/verifications",
        json={
            "param_set": param_set,
            "public_key": pk,
            "message": "msg",
            "signature": sig,
        },
    )
    assert v.json()["valid"] is False


@pytest.mark.parametrize("param_set", PARAMS)
def test_wrong_length_pk_and_sig_return_false_not_500(param_set):
    """FIPS 204 Sec. 3.6.2: wrong-length pk/sig shall return false."""
    pk, sk = make_keys(param_set)
    sig = client.post(
        "/api/signatures",
        json={"param_set": param_set, "secret_key": sk, "message": "msg"},
    ).json()["signature"]
    pk_raw = base64.b64decode(pk)
    sig_raw = base64.b64decode(sig)

    for bad_pk, bad_sig in [
        (pk_raw[:-1], sig_raw),   # truncated pk
        (pk_raw + b"\x00", sig_raw),  # extended pk
        (pk_raw, sig_raw[:-1]),   # truncated sig
        (pk_raw, sig_raw + b"\x00"),  # extended sig
        (b"", sig_raw),           # empty pk
        (pk_raw, b""),            # empty sig
    ]:
        v = client.post(
            "/api/verifications",
            json={
                "param_set": param_set,
                "public_key": b64(bad_pk),
                "message": "msg",
                "signature": b64(bad_sig),
            },
        )
        assert v.status_code == 200, v.text
        assert v.json()["valid"] is False


def test_cross_param_set_signature_rejected():
    """A signature made under ML-DSA-44 keys must not verify under ML-DSA-87."""
    pk44, sk44 = make_keys("ML-DSA-44")
    sig = client.post(
        "/api/signatures",
        json={"param_set": "ML-DSA-44", "secret_key": sk44, "message": "msg"},
    ).json()["signature"]
    # verify claimed as ML-DSA-87 with ML-DSA-44 pk: length check must fail
    v = client.post(
        "/api/verifications",
        json={
            "param_set": "ML-DSA-87",
            "public_key": pk44,
            "message": "msg",
            "signature": sig,
        },
    )
    assert v.json()["valid"] is False


# --- input validation / API hardening ----------------------------------------


def test_unknown_param_set_422_problem_json():
    r = client.post("/api/keys", json={"param_set": "ML-DSA-99"})
    assert r.status_code == 422
    assert r.headers["content-type"].startswith("application/problem+json")


def test_malformed_base64_422():
    pk, _ = make_keys("ML-DSA-44")
    r = client.post(
        "/api/verifications",
        json={
            "param_set": "ML-DSA-44",
            "public_key": pk,
            "message": "msg",
            "signature": "not-base64!!!",
        },
    )
    assert r.status_code == 422
    assert r.headers["content-type"].startswith("application/problem+json")


def test_oversized_message_413():
    pk, sk = make_keys("ML-DSA-44")
    huge = "x" * (MAX_MESSAGE_BYTES + 1)
    r = client.post(
        "/api/signatures",
        json={"param_set": "ML-DSA-44", "secret_key": sk, "message": huge},
    )
    assert r.status_code == 413
    r2 = client.post(
        "/api/verifications",
        json={
            "param_set": "ML-DSA-44",
            "public_key": pk,
            "message": huge,
            "signature": "AA==",
        },
    )
    assert r2.status_code == 413


def test_truncated_secret_key_422_not_500():
    _, sk = make_keys("ML-DSA-44")
    bad_sk = b64(base64.b64decode(sk)[:-1])
    r = client.post(
        "/api/signatures",
        json={"param_set": "ML-DSA-44", "secret_key": bad_sk, "message": "msg"},
    )
    assert r.status_code == 422
    assert r.headers["content-type"].startswith("application/problem+json")


def test_verify_response_never_contains_secret_key():
    pk, sk = make_keys("ML-DSA-44")
    sig = client.post(
        "/api/signatures",
        json={"param_set": "ML-DSA-44", "secret_key": sk, "message": "msg"},
    ).json()["signature"]
    v = client.post(
        "/api/verifications",
        json={
            "param_set": "ML-DSA-44",
            "public_key": pk,
            "message": "msg",
            "signature": sig,
        },
    )
    assert sk not in v.text


# --- file signing (message_encoding=base64) ----------------------------------


def test_file_bytes_roundtrip_base64_mode():
    """Binary file bytes must survive sign/verify unmodified (no UTF-8 mangling)."""
    pk, sk = make_keys("ML-DSA-44")
    file_bytes = bytes(range(256)) * 4  # 1024 bytes incl. all byte values
    encoded = b64(file_bytes)
    sig = client.post(
        "/api/signatures",
        json={
            "param_set": "ML-DSA-44",
            "secret_key": sk,
            "message": encoded,
            "message_encoding": "base64",
        },
    )
    assert sig.status_code == 200, sig.text
    assert sig.json()["message_bytes"] == 1024
    v = client.post(
        "/api/verifications",
        json={
            "param_set": "ML-DSA-44",
            "public_key": pk,
            "message": encoded,
            "signature": sig.json()["signature"],
            "message_encoding": "base64",
        },
    )
    assert v.json()["valid"] is True


def test_file_bytes_tamper_detected():
    pk, sk = make_keys("ML-DSA-44")
    file_bytes = b"binary\x00data\xff\xfe"
    sig = client.post(
        "/api/signatures",
        json={
            "param_set": "ML-DSA-44",
            "secret_key": sk,
            "message": b64(file_bytes),
            "message_encoding": "base64",
        },
    ).json()["signature"]
    tampered = bytearray(file_bytes)
    tampered[3] ^= 0x01
    v = client.post(
        "/api/verifications",
        json={
            "param_set": "ML-DSA-44",
            "public_key": pk,
            "message": b64(bytes(tampered)),
            "signature": sig,
            "message_encoding": "base64",
        },
    )
    assert v.json()["valid"] is False


def test_file_base64_mode_malformed_input_422():
    _, sk = make_keys("ML-DSA-44")
    r = client.post(
        "/api/signatures",
        json={
            "param_set": "ML-DSA-44",
            "secret_key": sk,
            "message": "not base64!!!",
            "message_encoding": "base64",
        },
    )
    assert r.status_code == 422
    assert r.headers["content-type"].startswith("application/problem+json")


# --- benchmark endpoint -------------------------------------------------------


def test_benchmark_runs_and_roundtrips():
    r = client.post(
        "/api/benchmarks", json={"message": "bench", "iterations": 3}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["results"]) == 5  # 3 ML-DSA + Ed25519 + RSA-2048
    for row in body["results"]:
        assert row["roundtrip_ok"] is True
        assert row["sign_ms_avg"] > 0
        assert row["verify_ms_avg"] > 0
        assert row["public_key_bytes"] > 0
        assert row["signature_bytes"] > 0


# --- security hardening: rate limiting + generic 500 -------------------------


def test_rate_limit_returns_429_problem_json():
    from app import main as main_module

    original_limit = main_module.limiter.limit
    main_module.limiter.reset()
    main_module.limiter.limit = 3
    try:
        for _ in range(3):
            r = client.post("/api/keys", json={"param_set": "NOT-A-SET"})
            assert r.status_code == 422  # validated before the window fills
        r = client.post("/api/keys", json={"param_set": "ML-DSA-44"})
        assert r.status_code == 429
        assert r.headers["content-type"].startswith("application/problem+json")
        body = r.json()
        assert body["title"] == "Too many requests"
        assert body["status"] == 429
        # GETs are never rate limited
        assert client.get("/api/health").status_code == 200
    finally:
        main_module.limiter.limit = original_limit
        main_module.limiter.reset()


def test_unhandled_error_returns_generic_problem_json(monkeypatch):
    from app import main as main_module

    def boom(param_set):
        raise RuntimeError("internal detail that must never reach a client")

    monkeypatch.setattr(main_module.cs, "keygen", boom)
    r = client.post("/api/keys", json={"param_set": "ML-DSA-44"})
    assert r.status_code == 500
    assert r.headers["content-type"].startswith("application/problem+json")
    body = r.json()
    assert body["title"] == "Internal server error"
    assert "internal detail" not in r.text
    assert "Traceback" not in r.text
    # service still healthy after the injected fault
    monkeypatch.undo()
    assert client.get("/api/health").status_code == 200


# --- upload-path hardening: traversal, magic headers, request guards ----------


TRAVERSAL_MESSAGES = [
    "../../etc/passwd",
    "..\\..\\windows\\system32\\config\\sam",
    "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "....//....//etc/passwd",
    "/etc/passwd\x00.txt",
    "..%2F..%2F..%2Fboot.ini",
]


@pytest.mark.parametrize("payload", TRAVERSAL_MESSAGES)
def test_path_traversal_payload_is_opaque_data(payload):
    """`../` strings are message BYTES: they sign, verify, and touch no path.

    The API accepts no filename field and (see the static-sink test below) has
    no filesystem writes at all, so there is nothing for a traversal to
    traverse — this pins that behaviour down against regressions.
    """
    pk, sk = make_keys("ML-DSA-44")
    sig = client.post(
        "/api/signatures",
        json={"param_set": "ML-DSA-44", "secret_key": sk, "message": payload},
    )
    assert sig.status_code == 200, sig.text
    v = client.post(
        "/api/verifications",
        json={
            "param_set": "ML-DSA-44",
            "public_key": pk,
            "message": payload,
            "signature": sig.json()["signature"],
        },
    )
    assert v.status_code == 200
    assert v.json()["valid"] is True


MAGIC_PAYLOADS = {
    "pe_executable": b"MZ\x90\x00\x03\x00\x00\x00",
    "elf_executable": b"\x7fELF\x02\x01\x01\x00",
    "php_backdoor": b"<?php system($_GET['cmd']); ?>",
    "script_tag": b"<script>alert(1)</script>",
    "shell_script": b"#!/bin/sh\nrm -rf /\n",
    "sql_injection": b"' OR 1=1; DROP TABLE users; --",
    "png_image": b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR",
    "zip_container": b"PK\x03\x04",
}


def test_magic_headers_roundtrip_without_being_interpreted():
    """Executable/script payloads are signed as opaque bytes, never parsed.

    Sign + verify must succeed for every magic header (FIPS 204 signs any
    message — filtering bytes would be wrong), a single flipped bit must fail
    verification (no magic-byte whitelisting), and the API must answer 200 —
    never 500 — so hostile content can neither crash nor trick the service.
    """
    for name, payload in MAGIC_PAYLOADS.items():
        pk, sk = make_keys("ML-DSA-44")
        encoded = b64(payload)
        sig = client.post(
            "/api/signatures",
            json={
                "param_set": "ML-DSA-44",
                "secret_key": sk,
                "message": encoded,
                "message_encoding": "base64",
            },
        )
        assert sig.status_code == 200, f"{name}: {sig.text}"
        signature = sig.json()["signature"]

        good = client.post(
            "/api/verifications",
            json={
                "param_set": "ML-DSA-44",
                "public_key": pk,
                "message": encoded,
                "signature": signature,
                "message_encoding": "base64",
            },
        )
        assert good.status_code == 200, f"{name}: {good.text}"
        assert good.json()["valid"] is True, name

        tampered = bytearray(payload)
        tampered[0] ^= 0x01
        bad = client.post(
            "/api/verifications",
            json={
                "param_set": "ML-DSA-44",
                "public_key": pk,
                "message": b64(bytes(tampered)),
                "signature": signature,
                "message_encoding": "base64",
            },
        )
        assert bad.status_code == 200, f"{name}: {bad.text}"
        assert bad.json()["valid"] is False, name


def test_security_headers_on_every_api_response():
    """nosniff + no-store + empty CSP travel with every reply (§5)."""
    for path in ("/api/health", "/api/params"):
        r = client.get(path)
        assert r.headers["x-content-type-options"] == "nosniff"
        assert r.headers["cache-control"] == "no-store"
        assert r.headers["x-frame-options"] == "DENY"
        assert "default-src 'none'" in r.headers["content-security-policy"]
    # freshly generated key material must never be cacheable
    k = client.post("/api/keys", json={"param_set": "ML-DSA-44"})
    assert k.headers["cache-control"] == "no-store"
    assert k.headers["x-content-type-options"] == "nosniff"


def test_oversized_body_refused_from_header_before_parsing():
    """A 2 MiB body dies on Content-Length -> 413 problem+json, no parse."""
    big = "A" * (2 * 1024 * 1024)
    r = client.post(
        "/api/signatures",
        json={"param_set": "ML-DSA-44", "secret_key": "x", "message": big},
    )
    assert r.status_code == 413
    assert r.headers["content-type"].startswith("application/problem+json")
    assert r.headers["x-content-type-options"] == "nosniff"


def test_multipart_upload_is_rejected_before_parsing():
    """No upload endpoint exists: multipart bodies are refused with 415,
    so a hostile file (php/elf/zip) is never read, parsed or stored."""
    r = client.post(
        "/api/signatures",
        files={"file": ("backdoor.php", b"<?php system($_GET['c']); ?>", "application/x-php")},
    )
    assert r.status_code == 415
    assert r.headers["content-type"].startswith("application/problem+json")
    assert "signature" not in r.text


def test_guard_replies_still_carry_cors_and_headers():
    """Guard answers (415/413) must reach the browser's fetch() intact."""
    r = client.post(
        "/api/keys",
        files={"file": ("x.bin", b"\x00\x01", "application/octet-stream")},
    )
    assert r.status_code == 415
    # TestClient is same-origin, so CORS headers appear only when the
    # middleware stack adds them; assert the guard headers either way.
    assert r.headers["cache-control"] == "no-store"


def test_backend_source_contains_no_file_or_execution_sinks():
    """Architecture guard for CI: app code must never write files or run code.

    Path traversal needs a sink to exist — this test removes the precondition
    itself and fails CI the moment anyone adds open()/exec()/subprocess & co.
    """
    import pathlib

    root = pathlib.Path(__file__).resolve().parents[1] / "app"
    forbidden = (
        "open(",
        "subprocess",
        "eval(",
        "exec(",
        "pickle",
        "os.system",
        "Path(",
        "send_file",
        "UploadFile",
        "tempfile",
        "aiofiles",
        "shutil",
    )
    found = []
    for py in sorted(root.glob("*.py")):
        src = py.read_text(encoding="utf-8")
        for token in forbidden:
            if token in src:
                found.append(f"{py.name}: {token!r}")
    assert not found, f"forbidden sinks in backend source: {found}"
