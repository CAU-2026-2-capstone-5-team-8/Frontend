# Release verification — 2026-10-04

## Web artifact

The provider-neutral Docker image built successfully from `native/package-lock.json`
with Node 22 and Expo SDK 57. The generated web bundle is served by Node's built-in
HTTP modules; runtime image contains no installed npm packages. The image ran as
the unprivileged `node` user with a read-only filesystem, all Linux capabilities
dropped and `no-new-privileges`. Docker health status became `healthy`.

After the final mobile layout fix, the image was rebuilt as
`bookmatch-web:local-release-final`, image ID
`sha256:13a6ecc86435858a8e9caabb0797918c67f67ae5d40d96e35d42e54cb3cdd7eb`.
The build's recommendation component SHA-256 matched the signed-off workspace
source (`485b3e0dd5c35130598fe0b9519de31b7f34e76b8a1a3bec33343cb6e23c0216`).
The final container `bookmatch-web-release-final-20261004` uses port `18584`;
all 39 real API checks passed again through that image with the imported cover
metadata. Its `/healthz` returned `{"status":"ok"}`. Final logs are ignored
`native/.local-checks/release-final-build.log` and `release-final-smoke.json`.

Proxy regression checks: 4 passed. New release cases first failed against the old
server, then passed after implementing the health endpoint, HEAD requests,
HTML revalidation, missing-asset 404 and strict Backend origin validation. Existing
DELETE, authorization forwarding, upstream ownership errors and empty 204 handling
remain covered.

The initial build's npm audit reported 29 dependency findings (10 moderate, 19 high).
The malformed-URI decoder issue was fixed with a scoped dependency override and
the tested `query-string` compatibility patch, reducing the remaining findings to
28 (7 moderate, 21 high in the final container build audit). The final image applies
that patch during `npm ci`. Remaining findings require
separate dependency triage; the count does not describe installed server runtime
dependencies because that stage has none.

## Actual service verification

An isolated WSL Ubuntu / Java 21 / PostgreSQL 17.11 stack was created, with
PostgreSQL on `15483`, Backend on `18089`, and the release web container on `18583`.
The test database is `bookmatch`, container `bookmatch-release-check-20261004`.
The web container is `bookmatch-web-release-check-20261004`. Existing user databases
and the ports `18473`, `18474`, `18487` were not changed.

The real account flow passed through the built container and real Backend/DB:
registration 201, login 200, profile retrieval/edit/reload 200, logout 204 and
revoked-token rejection 401. The test used generated credentials and did not log
passwords or bearer tokens. Endpoint status output is kept in ignored
`native/.local-checks/release-account-container-check.json`.

Backend was then restarted using the cover-enabled build at
`/tmp/bookmatch-cover-tests.nK00u2/build/libs/backend-0.0.1-SNAPSHOT.jar`; database
migration and `/actuator/health` succeeded. The release container continued to
proxy this service. This is a local integration environment, not a public deployment.

## Data provenance and scope

The earlier macOS integration report's September 29 catalog handoff is absent on
this PC. It was not reconstructed with fake titles or source links. Current
collected September 23 Operating Systems catalog files were rebuilt with current
ML and imported as `actual-os25-sept23-learning-evidence-20261004`: 25 real books,
7 books with matched concepts and 59 book/concept matches. No prose difficulty
was fabricated. The new candidates SHA-256 is
`d4f4dbf4195db6aa07d06dac582097108734c94ddd7dcc7607d7cb3047d17cab`.

22 books received cover metadata from the already collected raw Open Library
records, linked through exact edition ISBNs; three books retain null cover metadata.
The reviewed SQL import ran only against this isolated database. Metadata presence
does not prove every remote image currently loads or has been visually checked.
Image rendering is a separate browser check; no replacement cover artwork was
invented for the missing three.

The available process question has a real human approval record in
Question-Generation's `reviews/os-reviewed-question-generation-v1.jsonl`, matching
the preserved Backend `generated-process.json` bytes by generated question ID.
The local assessment bootstrap includes that one approved objective item and eight
explicitly labelled local self-report prompts. The self-reports are integration
inputs, not eight additional human-approved objective questions. The synthetic v5
unit-test item is not used. Full production bank coverage and learner validation
remain separate from API behavior verification.

Full real HTTP verification passed 39 endpoint checks through the release image,
Backend and actual Python ML: signup/login/profile, nine saved answers, completion,
stored profile, v2 recommendation with five books from seven mapped candidates,
exact recommendation replay, shelf add/edit/read/delete, public review
create/update/read/delete, independent review preservation after shelf removal,
and logout. A separate account received 403 for another user's shelf edit,
review deletion and recommendation retrieval. Revoked sessions received 401.
Logs are ignored `native/.local-checks/release-full-check.json` and
`native/.local-checks/release-import.log`.

ML ran from the current checkout whose source tree matches merged main `88b0177`,
on Windows port 18013. WSL Backend used `http://172.29.240.1:18013`; this address is
specific to this machine's WSL network and is not a deployment setting. A fresh
runtime check must resolve its own service addresses. No local test records were
written to a production database.
