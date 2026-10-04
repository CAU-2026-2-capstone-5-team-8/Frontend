# Full-stack release runbook

The web release needs PostgreSQL, Backend and Python ML as well as the web image.
The following Linux commands describe one host with private loopback services.
For a managed platform, use its private service DNS names and secret store instead.
Only the HTTPS ingress should be public. Native app signing/store distribution is
not covered by this web release.

## Inputs to pin

- Frontend commit and built image digest; `native/package-lock.json` fixes npm dependencies.
- Backend commit including learning readiness v2 and cover metadata migration;
  Java 21, Gradle wrapper, resulting `backend-0.0.1-SNAPSHOT.jar` and its SHA-256.
- ML commit including learning readiness v2 (`88b0177` was verified), Python 3.12+
  and `uv.lock`; preserve the matching `configs/` beside the source.
- Catalog handoff directory with immutable manifest and original hashes;
  approved question input files and their actual review/grounding records.

The local check used the current September 23 collected OS data and generated
`ML/data/output/local-release-20261004/backend-manifest.json`. These ignored input
artifacts are **not present in a fresh clone**. Archive and deliver that exact
directory and its referenced canonical files, or generate a separately identified
handoff from other reviewed collected inputs. Changing paths inside a manifest
changes its identity; choose final deployment paths before the first import.
Do not reuse an existing snapshot ID with modified bytes. Relative artifact paths
resolve against the manifest directory.

## Build services

From the selected Backend checkout:

```sh
./gradlew clean build --no-daemon --console=plain
sha256sum build/libs/backend-0.0.1-SNAPSHOT.jar
```

Backend tests require Docker/Testcontainers. From the selected ML checkout:

```sh
uv sync --frozen
uv run --frozen pytest -q
```

The tested web build/run commands are in [web-release.md](web-release.md).
Do not replace locked dependencies with arbitrary upgrades during deployment.

## Database and runtime settings

Set a generated database password through a secret manager or non-logged shell
environment. The commands below intentionally fail if it is missing:

```sh
: "${POSTGRES_PASSWORD:?Set a generated database password}"
docker volume create bookmatch-db
docker run -d --name bookmatch-db --restart unless-stopped \
  -p 127.0.0.1:5432:5432 -v bookmatch-db:/var/lib/postgresql/data \
  -e POSTGRES_DB=bookmatch -e POSTGRES_USER=bookmatch -e POSTGRES_PASSWORD \
  postgres:17.11
docker exec bookmatch-db pg_isready -U bookmatch -d bookmatch

export DB_URL=jdbc:postgresql://127.0.0.1:5432/bookmatch
export DB_USERNAME=bookmatch DB_PASSWORD="$POSTGRES_PASSWORD"
export APP_AUTH_MODE=required ML_MODE=http ML_BASE_URL=http://127.0.0.1:8000
export SPRING_PROFILES_ACTIVE=production
# For this same-host example, Backend sees the web proxy on IPv4 loopback.
export APP_AUTH_TRUSTED_PROXY_CIDRS=127.0.0.1/32
export SERVER_PORT=8080
```

For an existing database, use its configured credentials and backup/restore
procedure. Do not recreate its volume. Apply migrations with the new Backend only
after backing up; the app validates its schema and runs Flyway migrations.

In the ML checkout, start the actual computation service under the host's process
supervisor (foreground command shown):

```sh
BOOKMATCH_ML_CONFIG_DIR="$PWD/configs" \
  uv run --frozen uvicorn bookmatch_ml.api:create_app --factory --host 127.0.0.1 --port 8000
```

## Explicit imports

In a separate shell with the Backend environment above, set these absolute paths
to reviewed, pinned inputs before running the import. The catalog importer fails
on hash/identity conflicts instead of replacing an active projection:

```sh
: "${CATALOG_MANIFEST:?Set absolute path to pinned catalog manifest}"
java -jar build/libs/backend-0.0.1-SNAPSHOT.jar \
  --spring.main.web-application-type=none --spring.profiles.active=local-catalog-import \
  --catalog-import.manifest-path="$CATALOG_MANIFEST"

: "${QUESTION_MANIFEST:?Set absolute path to approved question import manifest}"
java -jar build/libs/backend-0.0.1-SNAPSHOT.jar \
  --spring.main.web-application-type=none --spring.profiles.active=question-import \
  --question-import.manifest-path="$QUESTION_MANIFEST"
```

The question manifest uses Backend's `question-import-manifest-v1` schema with
`generated_path`, `reviews_path` and optional `grounding_path` entries. Only actual
approved items belong in the public bank. The local integration check's eight
self-reports plus one approved objective are deliberately a **local validation
bank**, not a complete production diagnostic. Do not deploy its test user/bank as
if it were a fully reviewed objective assessment.

Start Backend under the process supervisor:

```sh
java -jar build/libs/backend-0.0.1-SNAPSHOT.jar \
  --server.address=127.0.0.1 \
  --springdoc.api-docs.enabled=false --springdoc.swagger-ui.enabled=false
```

Run the web image on the same Linux host (or use a private container network):

```sh
docker run -d --name bookmatch-web --restart unless-stopped \
  --network host --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  -e HOST=127.0.0.1 -e PORT=5183 -e BACKEND_URL=http://127.0.0.1:8080 \
  -e TRUSTED_PROXY_CIDRS=127.0.0.1/32 \
  bookmatch-web:release
```

Configure the chosen HTTPS ingress to forward the public origin to loopback 5183.
The loopback trust values above assume that ingress connects from `127.0.0.1`
and overwrites client-provided forwarding headers with the actual client address.
For other topologies, replace each allowlist with that layer's exact upstream
socket addresses. Keep Backend private and `server.forward-headers-strategy=none`.
The production profile enables Backend's startup guards; setting `NODE_ENV` on the
web server does not enable them.
Use a platform request limit/rate limit and database backups appropriate to the
audience. Account recovery/email verification are not implemented; decide whether
the current account capabilities fit a controlled pilot before public signup.

## Verify and switch traffic

Check `/healthz` on web and `/actuator/health` on Backend. Confirm catalog count,
topic readiness and real source references. Run the full HTTP smoke against an
isolated staging database with the same pinned artifacts, then perform browser
signup, assessment, recommendations and shelf/review checks. Only then switch
public traffic to the pinned web image. Keep the previous image and DB backup;
rolling back the web image does not roll back database migrations automatically.

The local smoke and exact limitations are recorded in
[release-verification-2026-10-04.md](release-verification-2026-10-04.md).
