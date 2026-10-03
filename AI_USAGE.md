# AI Usage Disclosure — ML-DSA Signature Demo

This file records how artificial intelligence was used to build this project,
so a reviewer can tell what was generated, what was decided by a human, and
what was verified by machines.

## Tool

- **Agent:** OpenCode coding agent (model: MiMo-V2.6-Flash, provider: opencode).
- **Human:** the student team, acting as product owner and final reviewer
  (see `README.md` for the team).

## Decisions made by the human

Every scope and product decision below was chosen or approved by a person, not
inferred by the model:

1. Build a teaching demo for ML-DSA (NIST FIPS 204) with a Next.js frontend
   and a Python/FastAPI backend.
2. Use **real cryptographic libraries** — "crypto thật, không mô phỏng"
   (`PRODUCT.md`, Product Principles §1). No simulated signatures anywhere.
3. **Evidence-first:** no number may appear in code, UI, or documentation
   unless it was measured at runtime or quoted from a primary source
   (`docs/evidence/FIPS-204-EVIDENCE.md`).
4. **No database, no authentication, no accounts** — stateless by design.
5. **Encrypt/decrypt was dropped** from the scope (ML-DSA is a signature
   scheme; FIPS 204 does not encrypt).
6. English-language UI, single-page Operate-mode tool, first viewport shows
   the live proof.
7. Team names, CMC University / Information Security affiliation, and the
   repository target were supplied by the human.

## Work performed by the AI agent

- **Research:** reading FIPS 204 (65 pages) and its 2026 errata spreadsheet,
  extracting Tables 1–2 verbatim with page references and hashing the source
  files — written up in `docs/evidence/FIPS-204-EVIDENCE.md`.
- **Library evaluation:** writing and running the comparison script that
  checked `pqcrypto` and `quantcrypt` against the standard (39/39 checks,
  two-way interoperability across all three parameter sets).
- **Implementation:** FastAPI backend (endpoints, request guards, CORS,
  rate limit), Next.js frontend (operate board, drills, file interchange,
  `.ml-dsa` container format, CSP nonce middleware).
- **Testing:** authoring and running all automated tests — 42 pytest,
  40 vitest (incl. 9 component tests), 7 Playwright e2e tests.
- **Hardening and auditing:** upload-path hardening (415/413/429 guards,
  magic-header and path-traversal adversarial tests), dependency audits
  (`npm audit`, `pip-audit` — the latter triggered a `starlette`/`pytest`
  security upgrade), the `security-review` checklist written up in
  `docs/SECURITY-REVIEW.md`, and three rounds of `squirrelscan` website
  audits (74 → 82; findings fixed or documented as accepted).
- **Documentation:** this file, `README.md`, `REPORT.md`, `AGENTS.md`,
  `llms.txt`, Docker/CI configuration.

## Verification of the AI's output

AI-generated material was never accepted on its own word:

| Claim type | How it was checked |
|---|---|
| Crypto behavior | 39/39 cross-library checks vs FIPS 204; 0-FAIL edge suite |
| Backend API | 42 pytest tests incl. 12 adversarial upload-path tests |
| Frontend logic | 40 vitest tests incl. full sign → download → verify round-trip |
| Real browser behavior | 7 Playwright tests asserting zero console/CSP errors |
| Security posture | `npm audit` 0, `pip-audit` 0, checklist in `docs/SECURITY-REVIEW.md` |
| Website quality | `squirrelscan` surface + full audits, before/after files in `docs/audit/` |
| Dependency freshness | exact pins in `requirements.txt` / `package-lock.json` |

## Statement on numbers

Every benchmark, size, and timing shown by the demo is produced at runtime on
the machine running it. Quoted standard values (key/signature sizes, security
categories) come from FIPS 204 Tables 1–2 and are labelled with their source
in `docs/evidence/FIPS-204-EVIDENCE.md`. The two known deviations between the
libraries and the standard are listed in `REPORT.md` rather than hidden.
