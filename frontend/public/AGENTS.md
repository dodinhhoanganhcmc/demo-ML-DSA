# ML-DSA Signature Demo

A live demo of ML-DSA post-quantum digital signatures (NIST FIPS 204).

## What this site does

- Generate ML-DSA-44 / ML-DSA-65 / ML-DSA-87 key pairs (real FIPS 204 code).
- Sign and verify text messages and uploaded files in the browser.
- Show key/signature sizes and timings measured at runtime, never hard-coded.
- Compare ML-DSA against Ed25519 and RSA-2048 with the same message.

## Stack

- Frontend: Next.js (App Router, TypeScript) — `frontend/`.
- Backend: FastAPI (Python) — `backend/`, API on `http://127.0.0.1:8000`.
- Crypto: pqcrypto 1.0.0 (ML-DSA), quantcrypt 1.0.1 (cross-check),
  cryptography 50.0.2 (Ed25519 / RSA-2048). No hand-rolled cryptography.

## Key files

- `REPORT.md` — full student report (standard, evidence table, audit, security).
- `docs/evidence/FIPS-204-EVIDENCE.md` — FIPS 204 reading notes and evidence.
- `docs/audit/` — squirrelscan audit reports.
- `AI_USAGE.md` — how AI tooling was used to build this project.

## Privacy

No accounts, no cookies, no storage. See /privacy.
