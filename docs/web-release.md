# Web release

The release is the Expo web export plus the dependency-free Node HTTP server. The
browser calls same-origin `/api`; the server forwards those requests to Backend.
Backend and ML are separate services. Deploy this image behind an HTTPS ingress.

## Build and run

### Client address trust boundary

The web server overwrites `X-Forwarded-For` with the socket peer by default; browser-supplied `Forwarded` and `X-Real-IP` are never passed through. When an HTTPS ingress fronts this server, set `TRUSTED_PROXY_CIDRS` to its exact socket addresses/CIDRs. Only that allowlist may supply a chain, walked right-to-left to the first untrusted address. Malformed/oversized chains fall back to the socket peer. Hostnames, wildcard and `/0` are rejected.

Backend must set `APP_AUTH_TRUSTED_PROXY_CIDRS` to this web server's socket CIDR, and retain `server.forward-headers-strategy=none`. Do not trust all private networks or expose Backend directly through the same trusted network. Without these explicit settings the safe fallback remains per-peer throttling, so multiple users through an unconfigured proxy will share a quota. The Backend change is required together with this web change; no browser API shape changes.

See [Spring's proxy header security guidance](https://docs.spring.io/spring-security/reference/7.0/features/exploits/http.html). Trust configuration is operator-owned; no broad trust is enabled automatically.

From the repository root, using Node 22.13 or newer supported by Expo 57:

```sh
npm --prefix native ci
npm run check
npm run build:web
NODE_ENV=production BACKEND_URL=http://backend:8080 HOST=0.0.0.0 PORT=5183 npm --prefix native run serve:web
```

Or build the image from the repository root:

```sh
docker build -t bookmatch-web:release .
docker run --rm --name bookmatch-web --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  -p 127.0.0.1:5183:5183 -e BACKEND_URL=http://backend:8080 bookmatch-web:release
```

`backend` must resolve on the container's network (add the appropriate `--network`),
or replace it with the reachable private Backend origin. The example does not
create that Backend service. `.env.production.example` lists runtime variables;
the server does not automatically load dotenv files. Use the platform environment
settings or Docker `--env-file`. Never put secrets in `EXPO_PUBLIC_*` variables.

The runtime image runs as the unprivileged `node` user, contains only static assets
and the server, and requires an explicit `BACKEND_URL`. `/healthz` checks that the
web export exists; it does not assert DB/ML readiness. Verify Backend's
`/actuator/health` separately and exercise one authenticated recommendation.
HTML and assets revalidate to prevent stale releases; missing assets return 404.
The proxy preserves bearer authentication and idempotency keys, limits requests
to 64 KiB, does not follow upstream redirects, and times out after 25 seconds.

CI checks the application and exports web assets. Dependency versions are locked
by `native/package-lock.json`; base-image tags receive maintenance updates. Pin the
resolved image digest in the deployment platform for release/rollback traceability.
Keep the previous working image until the new deployment passes the smoke checks.

## Required service configuration and data

Backend requires Java 21 and PostgreSQL 17 with `DB_URL`, `DB_USERNAME`,
`DB_PASSWORD`, `SPRING_PROFILES_ACTIVE=production`, `APP_AUTH_MODE=required`, `ML_MODE=http`, and `ML_BASE_URL` pointing
to the private ML service. Do not use the default stub mode for a live release.
The Python service runs `uvicorn bookmatch_ml.api:create_app --factory` from the
ML checkout with its locked dependencies and configuration artifacts available.

An empty database is not a working catalog. Import the pinned catalog manifest
and approved assessment manifest using Backend's documented local import runners.
Keep original input files, SHA-256 values and snapshot identities. Existing active
projections cannot be silently replaced; enriched evidence uses a new feature
version and an explicitly planned activation. Unreviewed generated questions must
not be imported as approved questions. See the Backend repository's
`docs/linear-algebra-live-handoff.md` and `docs/learning-readiness-v2.md`.

Before public launch, configure the chosen domain/TLS ingress, private service
network, database persistence/backups, and platform request limits. Backend's
current account implementation has no email verification/password recovery;
decide the release audience accordingly. This repository does not provision those
external services. Native distribution is separate: provide a reachable HTTPS
`EXPO_PUBLIC_API_URL` ending in `/api` at build time, then perform device testing
and signing through the chosen iOS/Android distribution workflow.

## Smoke checks

Check `/healthz`, a direct deep link, and the actual `/api/topics` and `/api/books`
responses. In a disposable test database, register, log in, edit the profile,
complete an approved assessment, request `concept-learning-v2`, reload the stored
recommendation, add a book to the shelf and verify the saved state. Also verify
logout invalidates the token. A frontend fixture test cannot replace this check.

The automated HTTP check creates a new synthetic account and writes assessment and
shelf records. Point it only at an explicitly disposable test database:

```sh
SMOKE_API_URL=http://127.0.0.1:5183/api SMOKE_ALLOW_WRITES=1 node native/scripts/smoke-release.mjs
```

`--account-only` checks registration, login, profile save/reload and token revocation
without claiming assessment/recommendation/shelf coverage. It is useful before
catalog import, but does not replace the default full run. The script logs endpoint
status codes and no passwords or bearer tokens. It does not delete the test account.

### Verify both proxy and Backend login limits

Start a fresh disposable Backend with required authentication and
`APP_AUTH_TRUSTED_PROXY_CIDRS=127.0.0.1/32`. With no other authentication traffic,
run this from the Frontend root (no catalog or ML calculation is needed):

```sh
SMOKE_BACKEND_URL=http://127.0.0.1:8088 SMOKE_ALLOW_AUTH_ATTEMPTS=1 \
  node native/scripts/smoke-proxy-auth.mjs
```

This starts temporary loopback web proxies and sends 45 invalid login attempts
through them to the actual Backend. It verifies separate client quotas, the
account quota across changing addresses, right-to-left chain handling, rejection
of browser header forgery, and preservation of `Retry-After` on 429 responses.
It uses unique `example.invalid` account names and does not register accounts.
Limits are process-local and remain consumed until their 60-second windows expire;
use a fresh Backend or let those windows expire before rerunning. This check does
not validate a deployed ingress configuration or ML/recommendation accuracy.
