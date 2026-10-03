"""End-to-end smoke test against the RUNNING server (real HTTP, not TestClient).

Usage: python scripts/smoke_test.py [base_url]
Default base_url: http://127.0.0.1:8000
"""
from __future__ import annotations

import base64
import sys

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
fails: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {detail}")
    if not cond:
        fails.append(name)


def main() -> int:
    c = httpx.Client(base_url=BASE, timeout=120.0)

    r = c.get("/api/health")
    check("health", r.status_code == 200 and r.json()["status"] == "ok", f"HTTP {r.status_code}")

    r = c.get("/api/params")
    check("params", r.status_code == 200 and len(r.json()["param_sets"]) == 3)
    table2 = {
        p["name"]: p["standard_reference"]
        for p in r.json()["param_sets"]
    }
    check(
        "Table 2 reference values quoted correctly",
        table2["ML-DSA-44"]["public_key_bytes"] == 1312
        and table2["ML-DSA-44"]["signature_bytes"] == 2420
        and table2["ML-DSA-65"]["signature_bytes"] == 3309
        and table2["ML-DSA-87"]["signature_bytes"] == 4627,
        str(table2),
    )

    message = "Smoke test — chữ ký ML-DSA"
    for ps in ("ML-DSA-44", "ML-DSA-65", "ML-DSA-87"):
        r = c.post("/api/keys", json={"param_set": ps})
        ok = r.status_code == 200
        check(f"{ps} keygen HTTP", ok, f"HTTP {r.status_code}")
        if not ok:
            continue
        body = r.json()
        pk, sk = body["public_key"], body["secret_key"]

        spec = table2[ps]
        check(
            f"{ps} measured sizes == Table 2",
            body["measured"]["public_key_bytes"] == spec["public_key_bytes"]
            and body["measured"]["secret_key_bytes"] == spec["secret_key_bytes"],
            f"measured={body['measured']} spec={spec}",
        )

        r = c.post(
            "/api/signatures",
            json={"param_set": ps, "secret_key": sk, "message": message},
        )
        check(f"{ps} sign HTTP", r.status_code == 200, f"HTTP {r.status_code}")
        sig = r.json()["signature"]
        check(
            f"{ps} measured signature == Table 2",
            r.json()["measured"]["signature_bytes"] == spec["signature_bytes"],
            f"{r.json()['measured']['signature_bytes']} vs {spec['signature_bytes']}",
        )

        # valid
        r = c.post(
            "/api/verifications",
            json={"param_set": ps, "public_key": pk, "message": message, "signature": sig},
        )
        check(f"{ps} verify valid -> true", r.json().get("valid") is True, r.text[:120])

        # tampered message
        r = c.post(
            "/api/verifications",
            json={"param_set": ps, "public_key": pk, "message": message + "!", "signature": sig},
        )
        check(f"{ps} tampered msg -> false", r.json().get("valid") is False, f"HTTP {r.status_code}")

        # tampered signature (flip last byte)
        raw = bytearray(base64.b64decode(sig))
        raw[-1] ^= 0xFF
        r = c.post(
            "/api/verifications",
            json={
                "param_set": ps,
                "public_key": pk,
                "message": message,
                "signature": base64.b64encode(bytes(raw)).decode(),
            },
        )
        check(f"{ps} tampered sig -> false", r.json().get("valid") is False, f"HTTP {r.status_code}")

        # wrong length (FIPS 204 3.6.2)
        r = c.post(
            "/api/verifications",
            json={
                "param_set": ps,
                "public_key": pk,
                "message": message,
                "signature": base64.b64encode(b"\x00" * 10).decode(),
            },
        )
        check(
            f"{ps} wrong-length sig -> false (200, not 500)",
            r.status_code == 200 and r.json().get("valid") is False,
            f"HTTP {r.status_code}",
        )

    # wrong param set -> 422 problem+json
    r = c.post("/api/keys", json={"param_set": "ML-DSA-99"})
    check(
        "unknown param set -> 422 problem+json",
        r.status_code == 422 and "problem+json" in r.headers.get("content-type", ""),
        f"HTTP {r.status_code} {r.headers.get('content-type','')}",
    )

    # benchmark
    r = c.post("/api/benchmarks", json={"message": "bench", "iterations": 3})
    check("benchmark HTTP", r.status_code == 200, f"HTTP {r.status_code}")
    if r.status_code == 200:
        rows = r.json()["results"]
        check("benchmark has 5 algorithms", len(rows) == 5, str([x["algorithm"] for x in rows]))
        check("benchmark all roundtrip_ok", all(x["roundtrip_ok"] for x in rows))
        check(
            "benchmark ML-DSA sizes == Table 2",
            all(
                x["signature_bytes"] == x["standard_reference"]["signature_bytes"]
                for x in rows
                if x["kind"] == "post-quantum"
            ),
        )
        print("\n--- measured benchmark (this machine, 3 iterations) ---")
        for x in rows:
            print(
                f"  {x['algorithm']:<11} pk={x['public_key_bytes']:>5}B "
                f"sig={x['signature_bytes']:>5}B "
                f"keygen={x['keygen_ms']:>8.3f}ms sign={x['sign_ms_avg']:>8.3f}ms "
                f"verify={x['verify_ms_avg']:>8.3f}ms"
            )

    print(f"\nTOTAL FAILURES: {len(fails)}")
    for f in fails:
        print("  -", f)
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
