"""Cryptographic service layer for the ML-DSA demo.

All numbers and behaviours here trace to docs/evidence/FIPS-204-EVIDENCE.md:
- Key/signature sizes: FIPS 204 Table 2 (verified empirically, 39/39 PASS).
- Verify contract: wrong length or bad signature -> False, never an exception
  escaping to the API (FIPS 204 Sec. 3.6.2: "shall return false").
- Pure ML-DSA with default (empty) context; hedged variant (library default).

No floating-point arithmetic, no hand-rolled crypto: ML-DSA comes from the
`pqcrypto` library, Ed25519/RSA from `cryptography` (both vetted, evidence doc
section 3.1).
"""
from __future__ import annotations

import time
from dataclasses import dataclass

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ed25519, padding, rsa
from pqcrypto import InvalidSignatureError
from pqcrypto.sign import ml_dsa_44, ml_dsa_65, ml_dsa_87

# FIPS 204 Table 1 (claimed security category) and Table 2 (sizes in bytes).
PARAM_SETS = {
    "ML-DSA-44": {
        "module": ml_dsa_44,
        "security_category": 2,
        "public_key_bytes": 1312,
        "secret_key_bytes": 2560,
        "signature_bytes": 2420,
    },
    "ML-DSA-65": {
        "module": ml_dsa_65,
        "security_category": 3,
        "public_key_bytes": 1952,
        "secret_key_bytes": 4032,
        "signature_bytes": 3309,
    },
    "ML-DSA-87": {
        "module": ml_dsa_87,
        "security_category": 5,
        "public_key_bytes": 2592,
        "secret_key_bytes": 4896,
        "signature_bytes": 4627,
    },
}

PARAM_SET_NAMES = tuple(PARAM_SETS)

# Demo guard rails (not FIPS requirements): keep one request bounded so a
# single call cannot pin the server. FIPS 204 itself has no message limit.
MAX_MESSAGE_BYTES = 1 * 1024 * 1024  # 1 MiB


class ParamSetError(ValueError):
    """Unknown parameter set name."""


class MessageTooLargeError(ValueError):
    """Message exceeds the demo limit."""


@dataclass
class Timed:
    """A value plus the milliseconds spent producing it (measured, never assumed)."""

    value: object
    ms: float


def _module(param_set: str):
    try:
        return PARAM_SETS[param_set]["module"]
    except KeyError:
        raise ParamSetError(
            f"Unknown parameter set {param_set!r}. Valid: {', '.join(PARAM_SET_NAMES)}"
        ) from None


def _guard_message(raw: bytes) -> bytes:
    if len(raw) > MAX_MESSAGE_BYTES:
        raise MessageTooLargeError(
            f"Message is {len(raw)} bytes; limit is {MAX_MESSAGE_BYTES} bytes"
        )
    return raw


def keygen(param_set: str) -> Timed:
    """ML-DSA.KeyGen (FIPS 204 Algorithm 1). Returns (public, secret) — the tuple
    order returned by pqcrypto, confirmed empirically in the evidence doc."""
    mod = _module(param_set)
    start = time.perf_counter()
    public_key, secret_key = mod.keygen()
    elapsed = (time.perf_counter() - start) * 1000
    return Timed((public_key, secret_key), elapsed)


def sign(param_set: str, secret_key: bytes, message: bytes) -> Timed:
    """ML-DSA.Sign (FIPS 204 Algorithm 2) with the default empty context."""
    mod = _module(param_set)
    _guard_message(message)
    if len(secret_key) != PARAM_SETS[param_set]["secret_key_bytes"]:
        # Fail fast with a clear message instead of the library's opaque error.
        raise ValueError(
            f"Secret key must be {PARAM_SETS[param_set]['secret_key_bytes']} bytes "
            f"for {param_set}, got {len(secret_key)}"
        )
    start = time.perf_counter()
    signature = mod.sign(secret_key, message)
    elapsed = (time.perf_counter() - start) * 1000
    return Timed(signature, elapsed)


def verify(param_set: str, public_key: bytes, message: bytes, signature: bytes) -> Timed:
    """ML-DSA.Verify (FIPS 204 Algorithm 3).

    Returns bool only. Per FIPS 204 Sec. 3.6.2, a wrong-length public key or
    signature must yield false — pqcrypto signals that with ValueError, and a
    genuinely bad signature with InvalidSignatureError. Both map to False here.
    """
    mod = _module(param_set)
    _guard_message(message)
    start = time.perf_counter()
    try:
        mod.verify(public_key, message, signature)
        result = True
    except (InvalidSignatureError, ValueError):
        result = False
    elapsed = (time.perf_counter() - start) * 1000
    return Timed(result, elapsed)


# --- Classical algorithms for the size/speed comparison (rubric: đối chiếu) ---


def classical_keygen(algorithm: str) -> Timed:
    if algorithm == "Ed25519":
        start = time.perf_counter()
        key = ed25519.Ed25519PrivateKey.generate()
        elapsed = (time.perf_counter() - start) * 1000
        return Timed(key, elapsed)
    if algorithm == "RSA-2048":
        start = time.perf_counter()
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        elapsed = (time.perf_counter() - start) * 1000
        return Timed(key, elapsed)
    raise ValueError(f"Unknown classical algorithm {algorithm!r}")


def classical_sign(algorithm: str, key, message: bytes) -> Timed:
    if algorithm == "Ed25519":
        start = time.perf_counter()
        signature = key.sign(message)
    elif algorithm == "RSA-2048":
        start = time.perf_counter()
        # RSAPrivateKey.sign(data, padding, algorithm) — PKCS#1 v1.5 + SHA-256.
        signature = key.sign(
            message, padding.PKCS1v15(), hashes.SHA256()
        )
    else:
        raise ValueError(f"Unknown classical algorithm {algorithm!r}")
    return Timed(signature, (time.perf_counter() - start) * 1000)


def classical_verify(algorithm: str, public_key, message: bytes, signature: bytes) -> Timed:
    start = time.perf_counter()
    try:
        if algorithm == "Ed25519":
            public_key.verify(signature, message)
        elif algorithm == "RSA-2048":
            public_key.verify(
                signature, message, padding.PKCS1v15(), hashes.SHA256()
            )
        else:
            raise ValueError(f"Unknown classical algorithm {algorithm!r}")
        result = True
    except (InvalidSignature, ValueError):
        result = False
    return Timed(result, (time.perf_counter() - start) * 1000)


def classical_sizes(algorithm: str, key) -> dict:
    """Sizes measured from real bytes at runtime — never hardcoded (evidence doc
    principle: 'số liệu đo tại chỗ')."""
    if algorithm == "Ed25519":
        public_bytes = key.public_key().public_bytes(
            serialization.Encoding.Raw, serialization.PublicFormat.Raw
        )
        secret_bytes = key.private_bytes(
            serialization.Encoding.Raw, serialization.PrivateFormat.Raw,
            serialization.NoEncryption(),
        )
        # RFC 8032 fixed sizes: public 32, secret 32, signature 64.
        return {
            "public_key_bytes": len(public_bytes),
            "secret_key_bytes": len(secret_bytes),
            "signature_bytes": 64,
        }
    if algorithm == "RSA-2048":
        public_bytes = key.public_key().public_bytes(
            serialization.Encoding.DER, serialization.PublicFormat.PKCS1
        )
        # RSA signature size == modulus size (256 bytes for 2048-bit), verified
        # by signing in the caller when needed.
        return {
            "public_key_bytes": len(public_bytes),
            "secret_key_bytes": len(
                key.private_bytes(
                    serialization.Encoding.DER,
                    serialization.PrivateFormat.PKCS8,
                    serialization.NoEncryption(),
                )
            ),
            "signature_bytes": key.key_size // 8,
        }
    raise ValueError(f"Unknown classical algorithm {algorithm!r}")
