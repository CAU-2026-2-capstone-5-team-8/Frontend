# Stability integration verification — 2026-10-05

The follow-up combines Backend #35 (`1db1e35`) and #36 (`e2177f5`) on
Backend main `554badc`, with Frontend #10 (`4413687`) on main `5d15406`.
Backend's local merge commit is `202d66f`. No live catalog or user DB was updated.

## Changes found during verification

- The proxy's real-peer test failed on macOS with `EADDRNOTAVAIL` for
  `127.0.0.2`. It now uses one dual-stack listener and actual IPv4/IPv6 loopback
  connections, without OS-specific loopback alias setup or skipping the check.
- Full-stack deployment commands omitted the production profile and proxy trust
  settings. They now explicitly enable the startup guards and document narrow,
  per-hop trust for the same-host example and its ingress assumptions.
- Added `native/scripts/smoke-proxy-auth.mjs` to exercise the actual web server
  and Backend together, rather than infer interoperability from separate tests.

## Results

- Backend Java 21 `./gradlew clean build`: 245 tests, 238 passed, 7 conditional
  live-ML/handoff tests skipped, 0 failures/errors. PostgreSQL Testcontainers
  covered concurrency, stale claims, migration preservation and auth behavior.
- Frontend after `npm --prefix native ci`: typecheck, lint and all 39 tests passed;
  `npm run build:web` exported successfully. Dependencies and the existing query
  decoder patch were restored from the lockfile; no dependency versions changed.
- Actual proxy → production-profile Backend → fresh PostgreSQL 17.11:

| Scenario | Expected and observed |
| --- | --- |
| 12 distinct client addresses | All 12 returned 401 for invalid credentials, none throttled |
| One account across 11 addresses | 10 × 401, then 429 |
| Forged leftmost address with fixed untrusted hop | 10 × 401, then 429 |
| Browser-supplied address without trusted ingress | 10 × 401, then 429 |

All 429 responses retained `Retry-After: 60`; cookies were not forwarded.
The script sent 45 requests. SQL confirmed zero account records afterward.
The Backend process and disposable PostgreSQL container were stopped afterward.
The authentication check configured HTTP ML mode but did not call ML.

## Reproduction and limits

Run `npm run check` and `npm run build:web` for the Frontend. Follow
[the proxy auth smoke instructions](web-release.md#verify-both-proxy-and-backend-login-limits)
against a fresh disposable Backend for the 45-request check.

This verifies the combined local changes, not public deployment, real ingress
configuration, live ML E2E, recommendation quality or mobile device behavior.
Existing dependency audit findings were not addressed in this scoped follow-up.
The three PRs still require their normal review/merge and environment-specific
deployment steps; this verification did not merge remote main or deploy services.
