# Report — ML-DSA Signature Demo

**Course project · CMC University, Information Security**
Team: Đỗ Đình Hoàng Anh · Ngô Bình Quang Anh · Mai Đức Minh · Trần Lê Minh
Date: October 2, 2026 · Repository: `dodinhhoanganhcmc/demo-ML-DSA`

---

## Opening

In August 2024 NIST published **FIPS 204**, standardizing **ML-DSA** — a
lattice-based digital signature designed to replace ECDSA and RSA once a
quantum computer can break them. A signature scheme's trustworthiness is not a
matter of opinion: the standard fixes the exact sizes (ML-DSA-65 ships a
1,952-byte public key and a 3,309-byte signature), and an implementation either
reproduces them or it is wrong. This report documents a teaching demo that
does reproduce them — running the standard's own algorithms, measuring
themselves in front of the viewer, and checking every artifact against the
standard's own tables.

The demo is a single web page backed by a local Python service. A visitor
generates a key pair, signs a message or a file with real ML-DSA-44/65/87
(FIPS 204) plus a classical Ed25519/RSA-2048 reference line, verifies the
signature, and — for files — downloads the signed container and re-verifies it
standalone. Nothing is simulated, nothing is stored, and nothing in this
report is asserted without a command behind it.

## 1 · What the demo is

| | |
|---|---|
| **Purpose** | A live demonstrator for ML-DSA signing: keygen → sign → verify that a viewer can operate themselves (`PRODUCT.md`). |
| **Stack** | Next.js 16 (App Router) frontend · Python 3.13 + FastAPI backend · `pqcrypto` for ML-DSA · `cryptography` for Ed25519/RSA. |
| **Mode** | Stateless: no database, no accounts, no file storage. Messages and keys live in browser memory; the backend forgets each request when the response is sent. |
| **Lines** | ML-DSA-44 / ML-DSA-65 / ML-DSA-87 (FIPS 204) compared against Ed25519 and RSA-2048 (classical) with runtime-measured timings. |
| **File flow** | Upload a file → sign → download `<name>.ml-dsa` → open that container → verify → extract the original bytes. The server never writes a file. |

Run it with one command (`docker compose up` — §7), open
`http://localhost:3000`, and the first viewport already shows the live status
of the three stations (Keygen → Sign → Verify):

![First viewport at 1280×720 — status, line selection, route strip and the top of the operate plate are above the fold](docs/screenshots/first-viewport-1280.png)

## 2 · The standard in brief

Grounding for the rest of this report (sources: FIPS 204 final PDF, SHA-256
`57239B9F…46B6B`, and its July 2026 errata spreadsheet; full citations in
`docs/evidence/FIPS-204-EVIDENCE.md`):

- **ML-DSA** (Module-Lattice-Based Digital Signature Algorithm) has three
  parameter sets. The standard's **Table 2** fixes their sizes — these are the
  numbers this demo must reproduce:

  | | Private key | Public key | Signature | Security category (Table 1) |
  |---|---:|---:|---:|---|
  | ML-DSA-44 | 2,560 B | 1,312 B | 2,420 B | 2 |
  | ML-DSA-65 | 4,032 B | 1,952 B | 3,309 B | 3 |
  | ML-DSA-87 | 4,896 B | 2,592 B | 4,627 B | 5 |

- The demo uses the **"pure" ML-DSA** variant with the default **empty
  context** and the library-default **hedged** signing mode — FIPS 204 §5.4
  says pure is preferred, and §3.4 says hedged is the interoperable default.
- **§3.6.2 is mandatory:** verification must return `false` whenever a public
  key or signature has the wrong length. The demo's tests attack this directly
  (§5).
- The July 2026 errata contains ten editorial corrections (typo in an NTT
  formula, `M` vs `M'`, symbol substitutions). NIST states: *"Potential
  corrections DO NOT introduce new technical requirements."* None affect the
  sizes or algorithms this demo uses.
- ML-DSA is derived from CRYSTALS-DILITHIUM but is **not** interchangeable
  with it (FIPS 204 App. D) — Dilithium round-3 test vectors are deliberately
  **not** used.

## 3 · Implementation — library-first (rubric 1)

**Decision: never hand-write the cryptography.** Re-implementing
NTT / SampleInBall / the rejection-sampling loop from 65 pages of pseudocode
would create errors that this course demo has no way to detect, and FIPS 204
§3.6.4 forbids floating-point arithmetic throughout. Every signature
operation is delegated to an audited library, and the demo's own code only
transports bytes:

- **`pqcrypto` 1.0.0** (Rust, PyPI) — primary ML-DSA implementation for all
  three parameter sets. Chosen after an evidence-phase evaluation that checked
  it against the standard (§4).
- **`quantcrypt` 1.0.1** — second, independent implementation used in tests to
  cross-verify signatures in both directions.
- **`cryptography` 50.0.2** — classical reference line (Ed25519, RSA-2048).
  It contains no ML-DSA, which is itself a useful contrast for the UI.

**Architecture.** The backend (`backend/app/main.py`) exposes five JSON
endpoints (`/api/health`, `/api/params`, `/api/keys`, `/api/signatures`,
`/api/verifications`) plus a benchmark endpoint. All input is validated by
Pydantic models; a middleware enforces JSON-only content type (HTTP 415), a
1.5 MiB request cap (HTTP 413), a per-IP rate limit (HTTP 429), and the
security headers (§9). CORS allows exactly two origins — `http://localhost:3000`
and `http://127.0.0.1:3000` — and only the `Content-Type` header.

The frontend (`frontend/src/components/Demo.tsx`) is a single Operate-mode
page: parameter-set line selector → mode (Text/File) → message → keys →
actions, with a route strip that lights up Keygen → Sign → Verify as the flow
completes, and two one-click drills (tamper one byte; verify against a freshly
generated key) so a viewer can *see* a signature fail the way it should.

**File interchange is fully client-side.** The signed artifact is a `.ml-dsa`
container assembled in the browser:

```
"MLDSAB01"            8-byte magic
u32 big-endian         manifest length
JSON manifest          { v, name, type, param_set, public_key, signature }
<message bytes>        the original file, byte-for-byte
```

The manifest embeds the public key, so a `.ml-dsa` file verifies standalone —
no server state, no re-upload of keys. Filenames are sanitized
client-side (`sanitizeFilename`), and because the server never receives a
path at all, the upload surface has **no path-traversal sink to have** (§9).

## 4 · Conformance — checking against the standard's tables

Before any product code was written, an evidence phase verified the libraries
against FIPS 204 (`docs/evidence/FIPS-204-EVIDENCE.md`):

1. **Sizes == Table 2.** Measured byte lengths of generated keys and
   signatures matched the standard exactly for **both libraries × all three
   parameter sets** (1,312/1,952/2,592 public keys; 2,420/3,309/4,627
   signatures).
2. **Two-way interoperability.** `pqcrypto` verified signatures produced by
   `quantcrypt` and vice versa — 3/3 parameter sets each way. Two independent
   implementations verifying each other's signatures is the strongest
   available evidence that both encode exactly what FIPS 204 specifies.
3. **39/39 checks passed:** round-trip signing, single-byte tampering of
   messages (rejected), tampering of signatures (rejected), wrong public key
   (rejected), and the interop checks — all across 44/65/87.
4. **Edge suite: 0 failures** — empty message, 1-byte, Vietnamese UTF-8,
   1 MiB; signature/key length truncation and extension rejected per §3.6.2;
   context rules per Algorithm 2 (including the 256-byte context refusal);
   garbage keys of valid length rejected without crashing.

**Two known deviations, recorded rather than hidden:**

| Library | Deviation | Impact on the demo |
|---|---|---|
| `pqcrypto` | Accepts context ≤ 253 bytes; FIPS 204 Alg. 2 allows ≤ 255. It is *stricter* than the standard. | None — the demo signs with the default empty context. |
| `quantcrypt` | Rejects empty messages (its schema requires ≥ 1 byte); FIPS 204 allows `M ∈ {0,1}*`. | None — the demo uses `pqcrypto`, which accepts empty messages (verified). |

Neither deviation can produce an invalid signature; both only reject inputs
the standard would allow.

## 5 · Tests — 89 automated checks, all passing (rubric 2)

| Suite | Count | What it proves | Command |
|---|---:|---|---|
| Backend (pytest) | **42** | API contract, guard behavior, adversarial upload path | `pytest tests -q` → `42 passed` |
| Frontend (vitest) | **40** | Container format (17), byte utilities (14), component flows (9) | `npx vitest run` → `40 passed` |
| End-to-end (Playwright) | **7** | Real browser ↔ real backend; zero console/CSP errors | `npx playwright test` → `7 passed` |

Highlights of what the numbers cover:

- **Adversarial upload path (12 backend tests):** six traversal payloads
  (`../../etc/passwd`, `..\..\`, null byte, absolute paths…) round-trip
  byte-identically because no path ever reaches the server; eight magic-header
  payloads (PE, ELF, PNG, ZIP, PHP, `<script>`, SQLi) are signed, verified and
  rejected after a one-byte flip — the signature layer treats them as opaque
  bytes and never interprets them; multipart requests are refused with 415;
  oversized requests refused with 413; guard replies still carry CORS and
  security headers; a source guard asserts the backend contains no file-write
  API at all.
- **Full file round-trip (component + e2e):** upload → sign → *download the
  `.ml-dsa` container* → *open that exact file* → verify → extract the
  original — asserted byte-identical (`Buffer.compare(...) === 0`). A
  tampered container (one flipped bit) verifies `invalid` and offers **no**
  "download original" button.
- **Both drills, in a real browser:** flipping one character invalidates the
  signature; a freshly generated key pair cannot verify an old signature.
- **Zero console errors and zero CSP violations** asserted on every page — a
  nonce regression fails the suite.

Every command above was run on this machine during the project; CI runs the
same three commands (§6).

## 6 · CI/CD (rubric 3)

`.github/workflows/ci.yml` runs four jobs on every push and pull request:

1. **backend** — Python 3.13, `pip install -r requirements.txt`, `pytest tests -q`
   (pinned requirements; pip cache keyed on the lockfile-equivalent file).
2. **frontend** — Node 24, `npm ci` (from `package-lock.json`), `npx vitest run`,
   `npm run build` (typecheck included).
3. **docker** — `docker compose build`, so the packaged stack cannot rot.
4. **e2e** — starts the real backend and frontend, installs Chromium, runs
   `npx playwright test`.

There is no deployment target for a course demo that runs on the presenter's
machine, so "CD" here means: every push is packaged into a runnable
`docker compose up` stack and verified end-to-end. All four command sets were
executed locally before the workflow was written; their outputs are the ones
quoted in §5 and §7.

**Live run evidence:** the first GitHub Actions run on the pushed repository
(`37092579625`, 2026-10-03) finished green on all four jobs — backend
`42 passed` in 19 s, frontend vitest + production build in 41 s,
`docker compose build` in 50 s, and the Playwright suite (7/7) against a
freshly started stack in 1 m 30 s.

## 7 · Docker (rubric 4)

```bash
docker compose up --build
# frontend → http://localhost:3000   backend → http://127.0.0.1:8000
```

Verified on this machine, in this order:

| Step | Result |
|---|---|
| `docker compose build` | `ml-dsa-backend Built` · `ml-dsa-frontend Built` (exit 0) |
| `docker compose up -d` | both containers `Up`; `/api/health` → 200; `/` → 200 |
| `npx playwright test` against the containers | **7/7 passed** — including the full file round-trip through both containers |
| `curl` guard probe on the container | `415` + `x-frame-options: DENY` + `content-security-policy` + `access-control-allow-origin: http://localhost:3000` |

The images are purpose-built: backend runs as a non-root user with a
healthcheck; frontend is a multi-stage build (no dev server, `node` user,
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` during install). No database service
exists in the compose file because the application has no database by design.

## 8 · Evidence discipline (rubric 5)

- **Primary sources only.** FIPS 204 final PDF and its errata spreadsheet,
  both hash-pinned in `docs/evidence/FIPS-204-EVIDENCE.md` (§2 cites specific
  pages and tables from them).
- **No invented numbers.** Every size, timing and score shown by the demo or
  quoted in this report was produced by a command in this repository: the
  standard values come from FIPS 204 Tables 1–2 (labelled as such in the UI),
  and the timings are measured at runtime with `perf_counter` on the machine
  running the demo.
- **Deviations are reported** (§4's two rows, §12's accepted findings) instead
  of being smoothed over.
- The evidence file predates the implementation on purpose — it records what
  the standard says *before* the code was written, so the code could be
  checked against it rather than the other way around.
- **This report was itself audited last:** every count, score, rule ID, hash
  and endpoint named above was re-checked against its source file
  (`FIPS-204-EVIDENCE.md`, the pytest/vitest/Playwright outputs,
  `surface-final3.md`, `main.py`) after drafting.

## 9 · Security review

Full checklist with commands and results: `docs/SECURITY-REVIEW.md`. Summary:

- **Upload hardening:** JSON-only (415), size cap before body read (413),
  per-IP rate limit (429), all with RFC 7807 error bodies; guard replies carry
  the same security headers and CORS. 12 adversarial tests (§5) attack the
  path directly.
- **Headers (live-verified):** `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Cache-Control: no-store`, and a
  `default-src 'none'`-based policy on API responses; HTML pages carry a
  nonce-based `script-src` CSP (no `'unsafe-inline'` for scripts — every
  inline JSON-LD block is nonced; e2e asserts zero violations).
- **XSS surface:** React auto-escaping; the only four `dangerouslySetInnerHTML`
  usages render static JSON-LD; no `localStorage`/`sessionStorage`/cookies
  anywhere; no secrets exist in the app to leak.
- **Dependency audits (2026-10-02):** `npm audit` → **0 vulnerabilities**;
  `pip-audit -r requirements.txt` → **No known vulnerabilities found**. The
  pip audit initially flagged `starlette 0.47.3` (PYSEC-2026-*) and
  `pytest 8.4.2` (PYSEC-2026-1845); both were upgraded (`starlette 1.7.0` via
  `fastapi 0.142.2`, `pytest 9.0.3`), after which all 42 backend tests and
  the 7 e2e tests still pass.
- **Website audit (`squirrelscan` v0.0.101):** overall score improved
  **74 (C) → 82 (B)** across successive fix-and-rerun rounds; SEO 99,
  E-E-A-T 100, Structured Data 100, Legal Compliance 100, Accessibility 99,
  and the Security group has **0 warnings**. Raw reports:
  `docs/audit/surface-final3.md`, `docs/audit/full-final3.md`.

## 10 · UI/UX verification

- **First viewport = live proof:** at 1280×720 the heading, `API online`
  status, line selector, Keygen → Sign → Verify route strip and the top of
  the operate plate are above the fold (screenshot in §1; asserted by the
  first Playwright test via `toBeInViewport`).
- The initial screenshot review caught a real defect — the status dot wrapped
  to its own line under the H1 — fixed by tightening the title scale, and the
  fold was raised so the operate plate is visible (before/after audits
  `surface-final.md` → `surface-final3.md`).
- **Placeholder sweep:** `[student name]` / `[contact email]` template text
  was found in the About/Contact pages during the first audit and replaced
  with the real team attribution; an e2e test now asserts those strings never
  return (`body` must not contain `[student name` or `[contact email]`).
- Content pages (`/about`, `/contact`, `/privacy`) return 200 with clean
  consoles; bylines, `datePublished` and stable `@id` entity references were
  added to satisfy E-E-A-T and structured-data rules (100/100 in §9).

## 11 · Rubric mapping

| # | Rubric point | Where it is proven |
|---|---|---|
| 1 | **Real crypto, library-first** | §3 (no hand-written crypto; `pqcrypto`/`quantcrypt`/`cryptography`), §4 (sizes == FIPS 204 Table 2, two-way interop 39/39) |
| 2 | **Frontend + backend tests pass** | §5 — 42 pytest + 40 vitest + 7 Playwright, all passing; same commands in CI (§6) |
| 3 | **CI/CD** | §6 — `.github/workflows/ci.yml`, 4 jobs (pytest, vitest+build, docker, e2e) |
| 4 | **`docker compose up` works** | §7 — build + up + 7/7 e2e verified against the containers |
| 5 | **Evidence-based report** | §8, `docs/evidence/FIPS-204-EVIDENCE.md`, `docs/SECURITY-REVIEW.md`, `AI_USAGE.md`, `docs/audit/*` |

## 12 · Known limitations and accepted findings

| Finding | Status | Why it is accepted |
|---|---|---|
| HTTP instead of HTTPS (audit `security/https`, 4 pages) | Environmental | A localhost demo has no trusted certificate; TLS is a deployment concern. Documented for production deployment. |
| No HTTP/2 (audit `perf/http2`) | Environmental | Requires HTTPS; same reason as above. |
| `perf/bad-caching` — no ETag/Last-Modified | Accepted trade-off | Pages are nonce-CSP + dynamic; emitting validators would promise immutability we cannot honor. `Cache-Control: no-store`/`must-revalidate` is the safer choice for a tool page. |
| `style-src 'unsafe-inline'` in CSP | Accepted debt | Required by React inline style attributes; scripts (the payload-bearing directive) are nonce-gated. |
| Keyword density "dsa 3.6%" (audit) | Domain-inherent | ML-DSA is the subject of the site; the density is natural prose. |
| The two library deviations | Documented (§4) | Both only reject standard-legal inputs; neither can emit an invalid signature. |
| `ax/token-weight` (page weight) warnings | Documented | The rule grades prose pages; this site is an interactive tool with short content pages by design. |

## 13 · How to run

```bash
# Option A — Docker (recommended for the presentation)
git clone https://github.com/dodinhhoanganhcmc/demo-ML-DSA.git
cd demo-ML-DSA
docker compose up --build
# open http://localhost:3000   (use localhost, not 127.0.0.1:3000 — CORS allow-list)

# Option B — local development
cd backend  && pip install -r requirements.txt
            && uvicorn app.main:app --port 8000
cd frontend && npm ci && npm run build && npm run start
# tests:  backend → pytest tests -q   frontend → npx vitest run   e2e → npx playwright test
```

## Appendix · Repository map

| Path | Contents |
|---|---|
| `backend/app/main.py` | FastAPI app, request guards, CORS, endpoints |
| `backend/tests/test_api.py` | 42 tests incl. adversarial upload suite |
| `frontend/src/components/Demo.tsx` | Operate board, drills, file interchange |
| `frontend/src/lib/bundle.ts` | `.ml-dsa` container encode/decode + sanitizers (17 tests) |
| `frontend/src/proxy.ts` | Nonce-based CSP middleware |
| `frontend/tests/e2e/demo.spec.ts` | 7 Playwright tests (real stack) |
| `docs/evidence/FIPS-204-EVIDENCE.md` | Primary-source evidence: tables, algorithms, errata, 39/39 + edge results |
| `docs/SECURITY-REVIEW.md` | Security checklist with commands and results |
| `docs/audit/` | squirrelscan reports (74 → 82 trajectory) |
| `.github/workflows/ci.yml` | 4-job CI/CD pipeline |
| `AI_USAGE.md` | AI usage disclosure and human decision log |
