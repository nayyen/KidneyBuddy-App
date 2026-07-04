---
phase: 06-community-education
plan: 04
subsystem: api
tags: [drizzle, express, zod, node-test, community]

# Dependency graph
requires:
  - phase: 06-community-education (plan 01)
    provides: community_posts table live in Postgres + communityPost.service.test.ts RED contract (deps-injection shape)
  - phase: 06-community-education (plan 02)
    provides: labResult/educationContent layering pattern (repository/service/controller/routes) mirrored here
provides:
  - POST /api/community (authenticated, create post scoped to caller)
  - GET /api/community (authenticated, public feed, filterable by kategori/metodeTerapi, newest-first, non-archived only)
  - GET /api/community/:id (authenticated, isMine derived server-side from req.user.id)
  - PATCH /api/community/:id/archive (authenticated, IDOR-safe, own-post-only, soft-archive never hard-delete)
affects: [06-05, 06-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "communityPost.service.ts's createPost/archivePost accept an optional trailing deps object ({ insert } / { archiveById }) defaulting to the real repository, matching the 06-01 RED scaffold's fixed deps-injection contract exactly — listFeed/getPostDetail follow the same optional-deps shape for consistency even though the RED scaffold didn't test them directly."

key-files:
  created:
    - backend/src/repositories/communityPost.repository.ts
    - backend/src/services/communityPost.service.ts
    - backend/src/controllers/community.controller.ts
    - backend/src/routes/community.routes.ts
  modified:
    - backend/src/app.ts

key-decisions:
  - "communityPost.repository.ts's findFeed/findById are NOT userId-scoped (unlike every other repository in this codebase except educationContent) — the community feed and post detail are public-to-all-authenticated-users by design (D-05/D-06/D-07); only archiveById is userId-scoped, purely for the IDOR ownership guard."
  - "getPostDetail derives isMine strictly server-side (row.userId === currentUserId) — never accepts or trusts a client-supplied isMine flag."
  - "createPost/archivePost's deps default parameter matches the 06-01 RED scaffold's exact partial-object shape ({ insert } only, { archiveById } only) rather than a fully-keyed deps object with every repository function — kept minimal to exactly satisfy the fixed test contract without overengineering."

requirements-completed: [COMMUNITY-01, COMMUNITY-03]

# Metrics
duration: ~35min
completed: 2026-07-04
---

# Phase 06: Community & Education — Plan 04 (Community Post Backend) Summary

**Authenticated create/feed/detail/archive for community posts — IDOR-safe archive-own-post via a compound `and(eq(userId), eq(id))` WHERE, a public non-userId-scoped newest-first filterable feed, and zero hard-delete code paths — the 06-01 RED scaffold `communityPost.service.test.ts` is now GREEN (6/6).**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments

- `communityPost.service.test.ts` (the 06-01 RED scaffold) is now GREEN — all 6 subtests pass: schema validation (valid + missing-judul-rejected), `createPost` persists via injected insert, `archivePost` archives the owner's post, `archivePost` returns `null` for a different user's post id (IDOR-safe, row left un-archived), and the structural no-hard-delete source check
- `communityPost.repository.ts` exports `create`, `findFeed`, `findById`, `archiveById` — `findFeed`'s base condition is `eq(diarsipkan, false)` with optional `kategori`/`metodeTerapi` filters pushed into the same `and(...)` WHERE, ordered `desc(createdAt)` (D-07 newest-first); confirmed via grep that the file contains zero `db.delete(` calls and one compound `and(eq(userId...), eq(id...))` guard on `archiveById`
- `POST /api/community`, `GET /api/community`, `GET /api/community/:id`, `PATCH /api/community/:id/archive` mounted at `/api/community`, all behind `authenticate`, delegating through thin controller handlers with no Zod or direct DB access in the controller layer
- Full backend suite run confirms zero new regressions: 12 failing tests total = the same 11 pre-existing failures documented in `06-01-SUMMARY.md`/`06-02-SUMMARY.md` (`activity.service.test.ts` x2, `fluidLog _createEntryCore`, `labResult` trend queries x3, `dispatchDueReminders` x4) plus the still-RED `communityReply.service.test.ts` (06-05 scope, not this plan) — down from 13 failures before this plan, confirming `communityPost.service.test.ts` flipped GREEN with no side effects

## Task Commits

1. **Task 1: communityPost repository + service (create/feed/detail/archive, GREEN test)** - `8085ffb` (test)
2. **Task 2: community controller (post handlers) + routes + app.ts mount** - `d95c621` (feat)

_Note: Task 1 is committed as `test(...)` because its primary observable outcome is turning the already-committed 06-01 RED scaffold GREEN, consistent with 06-02's precedent of a single commit per RED-to-GREEN task rather than a separate RED/GREEN/REFACTOR split (the RED file pre-existed from 06-01)._

## Files Created/Modified

- `backend/src/repositories/communityPost.repository.ts` - `create(row)`, `findFeed(options?)` (public, non-userId-scoped, filtered + newest-first), `findById(id)` (non-userId-scoped), `archiveById(userId, id)` (IDOR-safe compound WHERE, copied verbatim from `labResult.repository.ts`'s pattern)
- `backend/src/services/communityPost.service.ts` - `createPostSchema` (Zod, Indonesian error messages, judul max200/isi max5000/kategori+metodeTerapi enums), `listFeedQuerySchema`, `createPost(userId, payload, deps?)`, `listFeed(options?, deps?)`, `getPostDetail(currentUserId, id, deps?)` (server-derived `isMine`), `archivePost(userId, id, deps?)` — no `encrypt`/`decrypt` import (public content, RESEARCH Pitfall 1)
- `backend/src/controllers/community.controller.ts` - thin `createPost`/`listPosts`/`getPost`/`archivePost` handlers, 404 `{ code: "NOT_FOUND", message: "Postingan tidak ditemukan" }` on missing/foreign post, no Zod or repository/db imports
- `backend/src/routes/community.routes.ts` - `POST /`, `GET /`, `GET /:id`, `PATCH /:id/archive`, all behind `authenticate`
- `backend/src/app.ts` - added `communityRoutes` import + `app.use("/api/community", communityRoutes)` mount, education mount line preserved untouched

## Decisions Made

See `key-decisions` in frontmatter. Most notable: `findFeed`/`findById` deliberately carry no `userId` scoping condition — this mirrors `educationContent.repository.ts`'s precedent of a repository being intentionally NOT account-scoped, but for a different reason (public social content vs. shared reference content). Only `archiveById` is userId-scoped, and that scoping exists purely to enforce ownership (IDOR guard), not to filter visibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed a doc-comment phrase that created a false-positive grep match against the plan's own acceptance criteria**
- **Found during:** Task 1 acceptance-criteria verification (`grep -c "db.delete" backend/src/repositories/communityPost.repository.ts`)
- **Issue:** The repository file's top doc-comment originally read "No `db.delete(...)` call exists anywhere in this file" — a correct and true statement, but the literal substring `db.delete` inside that comment caused the plan's own verification grep to return `1` instead of the expected `0`, even though no actual hard-delete code existed.
- **Fix:** Reworded the comment to "No hard-delete call exists anywhere in this file" — same meaning, no longer contains the literal grep target string.
- **Files modified:** `backend/src/repositories/communityPost.repository.ts`
- **Verification:** `grep -c "db.delete" backend/src/repositories/communityPost.repository.ts` now returns `0`; `grep -c "DELETE FROM"` returns `0`; test suite re-run confirms still 6/6 GREEN.
- **Committed in:** `8085ffb` (Task 1, since the comment was written and fixed within the same task before commit)

---

**Total deviations:** 1 auto-fixed (self-inflicted grep false-positive, caught and fixed before commit)
**Impact on plan:** No scope creep — purely a documentation wording fix to satisfy the plan's own literal acceptance-criteria grep.

## Issues Encountered

- The plan's Task 2 acceptance criterion `grep -c "authenticate" backend/src/routes/community.routes.ts returns 4` undercounts by one: the actual count is `5` because the file's `import { authenticate } from "../middleware/authenticate.js"` line also contains the literal string "authenticate", in addition to the 4 route-level usages. Verified this is the same pattern as the existing `labResult.routes.ts` (11 occurrences: 1 import + 10 route usages), so this is an imprecise acceptance-criteria count in the plan text, not a defect — all four routes are in fact guarded by the `authenticate` middleware, which is the actual security requirement.
- 12 pre-existing/expected test failures remain (see Accomplishments) — 11 are the same unrelated failures flagged in `06-01-SUMMARY.md`/`06-02-SUMMARY.md`; the 12th is the `communityReply.service.test.ts` RED scaffold intentionally left red for 06-05. None introduced or worsened by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 06-05 (community replies + "membantu" toggle) can now build against a working `community_posts` API — reply routes will mount under the same `community.routes.ts` router this plan established.
- 06-06 (community feed UI) can now build `/komunitas`'s post creation/feed/detail/archive flows against a working, authenticated, filterable `GET /api/community` + `POST /api/community` + `GET /api/community/:id` + `PATCH /api/community/:id/archive` API.
- No blockers.

---
*Phase: 06-community-education*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 5 created/modified files and both task commit hashes (`8085ffb`, `d95c621`) verified present on disk / in git history.
