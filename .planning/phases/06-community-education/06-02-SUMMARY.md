---
phase: 06-community-education
plan: 02
subsystem: api
tags: [drizzle, express, zod, node-test, education]

# Dependency graph
requires:
  - phase: 06-community-education (plan 01)
    provides: education_content table live in Postgres + educationContent.service.test.ts RED contract (deps-injection shape)
provides:
  - GET /api/education (authenticated, filterable by metodeTerapi/tipeKonten, server-side SQL filtering)
  - GET /api/education/:id (authenticated, full article body, 404 on unknown id)
  - npm run seed:education (idempotent, 10 real Bahasa Indonesia articles across CAPD/HD/Transplantasi/Umum)
affects: [06-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "educationContent.service.ts's injectable deps typed loosely (any-typed FindAllFn/FindByIdFn, matching labResult.service.ts's InsertFn convention) so RED test doubles with a minimal row shape type-check against tsc --noEmit without weakening the real repository's return types"

key-files:
  created:
    - backend/src/repositories/educationContent.repository.ts
    - backend/src/services/educationContent.service.ts
    - backend/src/controllers/education.controller.ts
    - backend/src/routes/education.routes.ts
    - backend/src/seed/seed-education.ts
  modified:
    - backend/src/app.ts
    - backend/package.json

key-decisions:
  - "educationContent.repository.ts carries zero occurrences of the string 'userId' (including comments) — content is shared/public reference material, not scoped to any individual account, unlike every other repository in this codebase."
  - "listContent/getContentDetail default their deps param to the real repository, matching the exact 06-01 RED scaffold contract listContent(options, { findAll }) without modifying the test file."
  - "Seed script is clear-then-insert (delete all rows, re-insert the fixed 10-article set) rather than check-and-skip — simpler idempotency guarantee for a small, fully-managed content set with no user-generated rows to preserve."

requirements-completed: [EDU-01]

# Metrics
duration: ~40min
completed: 2026-07-04
---

# Phase 06: Community & Education — Plan 02 (Education Backend) Summary

**Authenticated, filterable GET /api/education + GET /api/education/:id backed by a Zod-validated service and a 10-article Bahasa Indonesia seed spanning CAPD/HD/Transplantasi/Umum — the education vertical's backend half is real and working end-to-end.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-07-04T15:20:00+07:00 (approx)
- **Completed:** 2026-07-04T15:44:01+07:00
- **Tasks:** 3
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments
- `educationContent.service.test.ts` (the 06-01 RED scaffold) is now GREEN — both subtests pass (`filters by metodeTerapi=CAPD...` and `with no filter returns all rows`)
- `GET /api/education` and `GET /api/education/:id` mounted, authenticated, and verified end-to-end against the live backend container: `?metodeTerapi=CAPD` returns only CAPD rows, no filter returns all 10 rows, `:id` lookup returns the full body, and an unauthenticated request correctly gets `401`
- `education_content` table seeded with 10 real, substantive Bahasa Indonesia articles (no lorem-ipsum) — 3 each for CAPD/HD (artikel, panduan_senam, gaya_hidup), 2 for Transplantasi (artikel, panduan_senam), 2 for Umum (artikel) — verified idempotent by re-running the seed and confirming the row count stays at 10
- Full backend suite run confirms zero regressions: 13 failing tests total = the same 11 pre-existing failures documented in 06-01-SUMMARY.md (`activity.service.test.ts`, `fluidLog _createEntryCore`, `labResult` trend queries, `dispatchDueReminders`) plus the 2 still-RED community scaffolds (`communityPost.service.test.ts`, `communityReply.service.test.ts` — in scope for 06-04/06-05, not this plan)

## Task Commits

1. **Task 1: Education repository + service (filter query, GREEN test)** - `03c03a5` (feat)
2. **Task 2: Education controller, routes, and app.ts mount** - `3819885` (feat)
3. **Task 3: Seed script with real Bahasa Indonesia education content** - `63679cd` (feat)

_Note: no TDD RED/GREEN/REFACTOR commit split was applicable here — the RED test file already existed from 06-01; Task 1's single commit turns it GREEN._

## Files Created/Modified
- `backend/src/repositories/educationContent.repository.ts` - `findAll(options?)` (Drizzle `eq()`/`and()` WHERE filtering by metodeTerapi/tipeKonten, `desc(createdAt)` ordering) + `findById(id)`; no account-scoping condition since content is shared
- `backend/src/services/educationContent.service.ts` - `listContent(options?, deps?)` + `getContentDetail(id, deps?)`, Zod `listQuerySchema` enum-validating metodeTerapi/tipeKonten before they reach SQL, injectable deps defaulting to the real repository
- `backend/src/controllers/education.controller.ts` - thin `list`/`getById` handlers, no business logic or validation, 404 JSON on missing id
- `backend/src/routes/education.routes.ts` - `GET /` and `GET /:id`, both behind `authenticate`
- `backend/src/app.ts` - added `educationRoutes` import + `app.use("/api/education", educationRoutes)` mount
- `backend/src/seed/seed-education.ts` - idempotent (delete-then-insert) seed of 10 real Bahasa Indonesia articles across all four therapy methods
- `backend/package.json` - added `seed:education` npm script

## Decisions Made
See `key-decisions` in frontmatter. Most notable: kept `listContent`/`getContentDetail`'s injectable-deps function types loosely (`any`-based, matching `labResult.service.ts`'s existing `InsertFn` convention) rather than tightly typing them to `EducationContent[]`, because the already-committed RED test's in-memory store intentionally returns a minimal row shape (`id`, `judul`, `metodeTerapi`, `tipeKonten` only) — a strict `EducationContent[]` return type would have failed `tsc --noEmit` against that fixed test file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Loosened injectable deps function typing to satisfy tsc --noEmit against the fixed RED test file**
- **Found during:** Task 2 (`npx tsc --noEmit` verification step)
- **Issue:** `FindAllFn`/`FindByIdFn` were initially typed to return `Promise<EducationContent[]>` (the full Drizzle-inferred row shape). The 06-01 RED scaffold's in-memory test store returns a narrower row shape (`{ id, judul, metodeTerapi, tipeKonten }`), so `tsc --noEmit` failed with a type-assignability error at the test's `listContent(options, { findAll: store.findAll })` call sites — and the test file is the binding contract, not editable.
- **Fix:** Changed `FindAllFn`/`FindByIdFn` to loosely-typed `any`-returning signatures (matching the existing convention in `labResult.service.ts`'s `InsertFn`), eliminating the mismatch while keeping the production repository call fully type-safe internally.
- **Files modified:** `backend/src/services/educationContent.service.ts`
- **Verification:** `npx tsc --noEmit 2>&1 | grep -iE "education"` returns nothing (`OK`); `node --import tsx --test src/test/educationContent.service.test.ts` still passes 2/2
- **Committed in:** `3819885` (bundled into Task 2's commit since it was surfaced by Task 2's tsc verification step)

**2. [Rule 3 - Blocking issue] Restarted the backend container to pick up the new route mount for end-to-end verification**
- **Found during:** Task 2/3 end-to-end curl-equivalent verification
- **Issue:** The running `kidneybuddy-backend` container runs `node --import tsx src/server.ts` directly (no nodemon in the production Dockerfile CMD), so editing `app.ts` on the host (volume-mounted into the container) did not take effect until the process restarted — `GET /api/education` returned an HTML 404 page instead of JSON.
- **Fix:** `docker restart kidneybuddy-backend`, then re-verified the endpoint.
- **Files modified:** none (operational step only)
- **Verification:** post-restart, `GET /api/education?metodeTerapi=CAPD` returns `200` with 3 CAPD-only rows; `GET /api/education` returns all 10; `GET /api/education/:id` returns the full body; unauthenticated request returns `401`

---

**Total deviations:** 2 auto-fixed (1 type-signature bug fix, 1 operational blocker)
**Impact on plan:** No scope creep. Both fixes were necessary to make the plan's own acceptance criteria (`tsc --noEmit` clean, live endpoint verification) actually pass.

## Issues Encountered
- The host machine cannot reach `localhost:4000` directly in this WSL2 environment (`curl` gets "Connection reset by peer" even for `/api/health`), despite the container listening correctly. Worked around by running verification `fetch()` calls from inside the `kidneybuddy-backend` container via `docker exec ... node -e "..."`, which confirmed the backend itself is fully functional. Not a code defect — a host/WSL2 port-forwarding quirk in this sandbox, unrelated to this plan's changes.
- 13 pre-existing/expected test failures remain (see Accomplishments) — 11 are the same unrelated failures flagged in `06-01-SUMMARY.md`; the other 2 are the community RED scaffolds intentionally left red for 06-04/06-05. None introduced or worsened by this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 06-03 (education frontend) can now build `/edukasi`'s real content browser against a working, filterable `GET /api/education` + `GET /api/education/:id` API with real seeded content.
- The `education_content` table has exactly 10 rows live; re-running `npm run seed:education` is safe (idempotent) if the frontend team needs a fresh seed during development.
- No blockers.

---
*Phase: 06-community-education*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 8 created/modified files and all 3 task commit hashes (`03c03a5`, `3819885`, `63679cd`) verified present on disk / in git history.
