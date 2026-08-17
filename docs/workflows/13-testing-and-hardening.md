# Workflow 13 — Testing and Hardening

## Objective

Close the security and robustness gaps before demo: security headers, rate limiting on
authentication endpoints, CORS policy, and a review that every §20 critical flow has test
coverage.

## User value

The app behaves safely under abuse and predictably under failure.

## Scope

- **Security headers** — `helmet` with defaults (CSP disabled: JSON API, no HTML).
- **Rate limiting** — `express-rate-limit` on `/api/auth` (10 requests / 15 min per IP on
  register/login/forgot/reset; logout exempt), responding with the standard envelope and
  a new `RATE_LIMITED` error code. Disabled under `NODE_ENV=test` except in the dedicated
  rate-limit test (injected config).
- **CORS** — `cors` with `CORS_ORIGIN` env (comma-separated; `*` default for MVP/dev).
- **Coverage review** — §20 critical flows checklist mapped to existing suites (register,
  login, goal, measurement, manual meal, analyze photo, confirm AI meal, activity,
  workout, sleep, score, daily/weekly insight — all covered; documented here).

### Decisions

- Rate limiting scoped to auth only for MVP — the write endpoints are all JWT-gated and
  single-user; broader limits can come with real traffic.
- No CI coverage-threshold gate yet (suite count and PR review carry that role at this
  size).

## Non-goals

- No penetration testing, no dependency-audit automation, no e2e device tests.

## Data model involved

None.

## Backend tasks

- [x] `helmet`, `cors` (env-configurable origin), auth rate limiter with envelope 429s.
- [x] `RATE_LIMITED` error code; limiter injectable for tests.
- [x] Tests: security headers present; 11th login attempt → 429 envelope.

## Frontend tasks

None (429 already surfaces through the generic error path).

## API contracts

Unchanged; abusive auth traffic now answers
`429 { ok: false, error: { code: "RATE_LIMITED", … } }`.

## Validation rules

- `CORS_ORIGIN` env: `*` or comma-separated origins.

## Security considerations

This whole workflow. Residual risks documented: no per-user write throttling, local file
storage depends on host disk permissions.

## Acceptance criteria

- Helmet headers on every response; auth brute force answers 429 after the window limit;
  CORS honors the configured origin. All CI checks green.

## Tests

Backend: headers assertion; rate-limit trip test with injected low limit; CORS header
test. §20 flow coverage verified against the existing 68-test suite.

## Definition of done

- [x] Acceptance criteria pass locally and in CI; checklists updated; summary reported.
