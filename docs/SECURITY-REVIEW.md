# Security Review — ML-DSA Signature Demo

Date: 2026-10-02 · Reviewer: automated checklist (`security-review` skill) + manual verification
Scope: `backend/` (FastAPI, port 8000), `frontend/` (Next.js 16, port 3000)
Method: every item below was verified against the running system or by grepping the
source; nothing is claimed without a command/test result recorded here.

## Summary

| Area | Verdict |
|---|---|
| Secrets management | PASS — no secrets exist in the app |
| Input validation | PASS — Pydantic schemas + size/type guards, adversarial tests |
| SQL injection | N/A — no database by design |
| Authentication / authorization | N/A — stateless local demo, no accounts |
| XSS | PASS — React auto-escape; JSON-LD is static; nonce CSP |
| CSRF | N/A — no cookies/sessions; JSON-only requests + CORS allow-list |
| Rate limiting | PASS — per-IP limit, HTTP 429, tested |
| Sensitive data exposure | PASS — no payload logging, RFC 7807 errors, no browser storage |
| File upload / path traversal | PASS — server never touches files; payload tests |
| Dependency security | PASS — `npm audit` 0, `pip-audit` 0 (after upgrade) |
| Security headers | PASS — CSP (nonce), nosniff, XFO DENY, no-store |

## 1 · Secrets management

- [x] No hardcoded API keys, tokens, or passwords — grep
  `(?i)(password|secret|api_key|token)\s*=\s*["']` over `backend/app/` → **0 matches**.
- [x] The app owns no credentials at all: it is a signature demo; no third-party
  services are called (privacy page: "calls no external API").
- [x] Nothing sensitive in browser storage — grep `localStorage|sessionStorage|
  document.cookie` over `frontend/src/` → **0 matches**.
- [ ] `.env*` ignored — handled by the root `.gitignore` written before the first
  commit (see §10).

## 2 · Input validation

- [x] **Request shape**: `request_guards` middleware rejects non-JSON
  `Content-Type` with HTTP 415 before the body is parsed (`backend/app/main.py`).
  Tested: `test_rejects_multipart_form_data` (415) in `backend/tests/test_api.py`.
- [x] **Size**: `Content-Length` cap of 1,572,864 bytes checked before reading
  the body → HTTP 413. Tested: `test_rejects_oversized_request`.
- [x] **Fields**: every endpoint validates with Pydantic models (unknown fields
  rejected, types enforced); over-limit messages/files return HTTP 400 with an
  RFC 7807 problem document.
- [x] **Magic headers / backdoor payloads**: adversarial suite signs and verifies
  PE, ELF, PNG, ZIP, PHP, `<script>`, and SQLi payloads as *opaque bytes* — the
  signature layer never interprets them, and a 1-byte flip is always rejected
  (`test_api.py`, `magic header` tests; `frontend/src/lib/bytes.test.ts`).
- [x] **Path traversal**: 6 traversal payloads (`../../etc/passwd`, `..\\..\\`,
  null byte, absolute paths, long names) round-trip byte-identically because the
  server never receives a filename as a path — the container filename is derived
  client-side and sanitized (`sanitizeFilename` in `frontend/src/lib/bundle.ts`).
  Tested: `traversal` tests in `test_api.py` + `bundle.test.ts`.
- [x] Error messages are RFC 7807 `application/problem+json` — no stack traces.

## 3 · SQL injection — N/A

No database, no SQL, no ORM. "No database" is a product decision
(`PRODUCT.md`): the backend is stateless between requests.

## 4 · Authentication / authorization — N/A

No accounts, no sessions, no tokens. The only access control is the CORS
allow-list (origin `http://localhost:3000` only) plus the per-IP rate limit.
The absence of auth is disclosed on the contact page ("no support desk… no
accounts to delete") and the privacy page.

## 5 · XSS

- [x] React renders all UI — no manual HTML concatenation.
- [x] Exactly four `dangerouslySetInnerHTML` usages exist (grep over
  `frontend/src/`), all of them `JSON.stringify(jsonLd)` of **static**
  structured data (team names, URLs, dates). No user input reaches them.
- [x] CSP via `frontend/src/proxy.ts`:
  `script-src 'self' 'nonce-…'` — no `'unsafe-inline'`/`'unsafe-eval'` for
  scripts. Verified live: 9/9 script tags carry the nonce; e2e asserts zero
  console/CSP violations on every page.
- [x] `style-src` keeps `'unsafe-inline'` — **accepted**: React inline style
  attributes (`style={{…}}`) require it; scripts (the XSS payload vector) are
  nonce-gated. Documented in `REPORT.md` §Security.

## 6 · CSRF — N/A

No cookies or session state exist to ride. Additional layers that make CSRF
moot: `Content-Type: application/json` is mandatory (415 otherwise), so no
HTML form can issue a simple cross-origin request; and CORS preflight allows
only origin `http://localhost:3000` with header `Content-Type`.

## 7 · Rate limiting

- [x] Per-IP sliding limit in `request_guards` → HTTP 429 with `Retry-After`.
  Tested: `test_rate_limit_returns_429` (12 rapid requests) in `test_api.py`.

## 8 · Sensitive data exposure

- [x] No logging of payloads: grep `print(` and `logger.*message|secret|
  public_key|signature` over `backend/app/` → **0 matches**.
- [x] Uvicorn access log records method/path/status only (observed live).
- [x] Responses carry `Cache-Control: no-store` so keys/signatures are not
  cached by intermediaries (verified by curl against `/api/health`).
- [x] Frontend never persists keys: no `localStorage`/`sessionStorage`
  (grep above); reloading the page discards them (privacy page statement).

## 9 · File upload / path traversal

- [x] The server has **no file-upload endpoint** and never writes files —
  multipart requests are rejected with 415. There is no `upload/` directory,
  no `open()` call in `backend/app/` (grep → 0 matches), so no traversal sink
  exists.
- [x] File interchange happens fully client-side (FileReader → base64 → JSON),
  and the `.ml-dsa` filename is sanitized client-side
  (`sanitizeFilename`, 17 tests in `bundle.test.ts`).
- [x] `static no-sink source guard` test asserts the app source contains no
  file-write API at all.

## 10 · Dependency security

Run 2026-10-02:

| Tool | Command | Result |
|---|---|---|
| npm | `npm audit` (frontend) | **0 vulnerabilities**, exit 0 |
| pip | `pip-audit -r backend/requirements.txt` | **No known vulnerabilities found**, exit 0 |

Remediation performed during this review:

- `starlette 0.47.3` → **1.7.0** (PYSEC-2026-1942/161/2281/2280/249/248)
- `fastapi 0.116.1` → **0.142.2** (compatible pin for starlette 1.x)
- `pytest 8.4.2` → **9.0.3** (PYSEC-2026-1845)

After the upgrade: `pytest` **42/42**, e2e **7/7**, live guard smoke (415 +
CORS + headers) verified — see `requirements.txt` exact pins.
Lockfile: `frontend/package-lock.json` committed → `npm ci` reproducible.

## 11 · Security headers (live, curl-verified)

```
HTTP/1.1 200 OK
x-content-type-options: nosniff
x-frame-options: DENY
cache-control: no-store
content-security-policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'   (API)
content-security-policy: script-src 'self' 'nonce-…'; …                                                    (HTML, via proxy.ts)
```

- Guard replies (415/413/429) carry the same headers **and**
  `access-control-allow-origin: http://localhost:3000` + `vary: Origin`
  (CORS registered outermost so the browser can read guard errors).
- HSTS is absent — **accepted**: local HTTP demo, documented in `REPORT.md`.

## 12 · Website audit (independent tool)

`squirrelscan` v0.0.101 against `http://localhost:3000` (files in `docs/audit/`):

- Security group **85**, warnings **0** — the only Security errors are the four
  `security/https` findings: the site is served over plain HTTP on localhost
  (environmental; TLS is a deployment concern, documented as accepted).
- Overall score **82 (B)**, up from **74 (C)** at first audit;
  E-E-A-T, Structured Data, Legal Compliance all **100**.

## Accepted findings (with rationale)

1. **No HTTPS on localhost** — a local demo cannot terminate TLS without a
   trusted cert; the report documents how to enable it in production.
2. **`Cache-Control: public, max-age=0, must-revalidate`, no ETag** —
   pages are nonce-CSP + `force-dynamic`; emitting validators would lie about
   immutability. The scanner's `perf/bad-caching` fail is accepted.
3. **`style-src 'unsafe-inline'`** — required by React style attributes;
   script-src (the payload-bearing directive) is nonce-based.
4. **`content/keyword-stuffing` "dsa 3.6%"** — domain-inherent term of an
   ML-DSA demo; density is natural prose, not manipulation.

## Evidence index

- `backend/tests/test_api.py` — 42 tests (incl. 12 adversarial: traversal,
  magic headers, 413/415, 429, headers, no-sink guard)
- `frontend/src/lib/bundle.test.ts` — 17 container tests
- `frontend/src/lib/bytes.test.ts` — 14 byte-level tests
- `frontend/src/components/Demo.test.tsx` — 9 component tests (incl. full
  round-trip and tampered container)
- `frontend/tests/e2e/demo.spec.ts` — 7 Playwright tests (real stack, zero
  console/CSP errors asserted)
- `docs/audit/surface-final3.md`, `docs/audit/full-final3.md` — final audits
