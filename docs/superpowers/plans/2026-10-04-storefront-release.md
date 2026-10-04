# Bookmatch storefront release implementation plan

> **For agentic workers:** Execute UI tasks in this session; independent catalog and release tooling are assigned separately. Preserve existing uncommitted learning-v2 changes.

**Goal:** Apply the approved bookstore prototype to the actual Expo app, connect existing APIs, and leave reproducible deployment artifacts with verified local integration.
**Architecture:** Keep Expo Router, account-isolated state, authenticated HTTP client and v2 recommendation contract. Replace presentation, not recommendation math. Backend adds optional verified cover metadata; no client-derived or synthetic covers. Existing web same-origin proxy is the deployment boundary.
**Tech Stack:** Expo 57, React Native 0.86, React 19.2.3, TypeScript, Node built-in tests, Spring Boot Backend and existing Python ML.
**Spec:** Approved `../../../../output/bookmatch-design-proposal/README.md` and user instructions: no technical evidence, limitations, snapshot IDs or comparison statistics in consumer UI; keep those in GitHub docs.

## Global constraints

- Existing frontend branch `feat/learning-readiness-ui`; do not reset unrelated changes.
- No fabricated covers, confidence, rankings, mastery, learner observations or completed learning.
- Preserve all five routes, authentication, account separation, assessment, shelf and public reviews.
- Missing covers get a plainly labeled placeholder, never a synthetic published cover.
- No production deployment, automatic merge, external account creation or secrets in source.

## Review focus

- Failed cover load or absent URL must leave usable book title/navigation.
- Old concept profiles require reassessment, while compatible v1 snapshots can upgrade.
- Topic/account/ability changes must not display previous-scope results.
- Empty recommendations and API outages must offer useful next actions without false completion.
- Mobile 320px, long titles, keyboard input and direct detail URLs must remain usable.

### Task 1: Shared storefront presentation and books

Files: theme/tokens.ts, components/AppShell.tsx, ui.tsx, BookCover.tsx, BookTile.tsx, lib/bookPresentation.ts, tests/bookPresentation.test.mjs, app/(tabs)/index.tsx.
Interfaces: Book `{ id,title,author,coverUrl?:string|null }`; `safeCoverUrl(value)` returns HTTPS-only URL or null; `BookCover` uses validated URL with onError fallback. Shared Page keeps existing props, now renders below a top navigation and above mobile tabs.
- [ ] Add test: HTTPS URL accepted, HTTP/file/javascript/credentials rejected, missing URL returns null. Run test before implementation and observe missing implementation fail.
- [ ] Implement URL validator, real image/fallback, unboxed book tiles; remove decorative glass/gradients and sidebar, retain routes and keyboard focus.
- [ ] Render existing paginated catalog with real API data, clear loading/error/retry/empty states and no fake search over unseen pages.
- [ ] Run `npm run check`, web build, browser navigation/width/cover checks.

### Task 2: Recommendations and reading detail

Files: app/(tabs)/recommendations.tsx, book/[id].tsx, components/RecommendationBook.tsx, ReadingChecklist.tsx, tests/learningRecommendations.test.mjs.
Interfaces: unchanged v2 POST selector, immutable GET, account/profile/topic/ability match and idempotency key. Cover comes from catalog/detail only; snapshot ranking remains server-owned.
- [ ] Keep existing RED/GREEN contract tests; add any regression reproduction before fixes.
- [ ] Feature first returned book, remaining unboxed tiles; criteria in compact controls. Remove snapshot IDs, candidate coverage, evidence metadata and limitations from UI.
- [ ] Reading detail shows actionable concepts/states; no source IDs, provenance or implementation explanations. No mastery claims. Keep author, description, shelf and reviews.
- [ ] Test old profile, unmeasured vs zero, empty list, refresh, retry and ability change through browser; run full check/build.

### Task 3: Release path and real integration

Files: owned by release-path worker: scripts/serve-web.mjs, deployment artifacts, tests, docs. Backend covers owned by catalog worker.
- [ ] Test deployment proxy configuration, health and forwarding with real HTTP tests before implementation.
- [ ] Build web and native bundles; document runtime env, HTTPS, database migrations, ML artifacts, health and rollback.
- [ ] Run actual Backend+ML test stack; signup/login/assessment/profile/v2 recommendation/shelf/reviews. No fixture result counts as this verification.
- [ ] Review full diff independently, fix material findings with tests, commit/push PR and verify CI. Do not merge new PR without explicit instruction.

## Progress / rulings

- Implementation and local verification completed: actual Expo storefront, v2 integration, optional verified-edition covers, release proxy/Docker, 34 passing tests, web/iOS/Android exports and 39 real-stack HTTP checks. Independent review found no remaining introduced P1/P2 issue; same-topic selection regression was fixed and rechecked in the browser.
- Browser verified 320/390px layouts and 1440px desktop; five recommendation cover images loaded. Individual edge-case evidence is in the release documents and test files; the task lists above retain the original planned checks rather than imply every case had a separate manual run.
- Production bank approval and learner validation are not completed by these tests. Hosting credentials, domain/TLS, production data and operational configuration remain deployment tasks. New PRs require review before merge.

- 2026-10-04: Current scope is the existing app, not new OCR/community subsystems. Deployment readiness means reproducible build and verified existing user flows; real hosting credentials, DNS/TLS and mobile store signing remain operator-owned.
- Existing synthetic fixture is only for deterministic UI edge cases. The approved HTML prototype is a design artifact, not shipped application code.
