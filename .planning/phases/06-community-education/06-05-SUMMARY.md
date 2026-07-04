---
phase: 06-community-education
plan: 05
subsystem: api
tags: [drizzle, express, zod, node-test, community]

# Dependency graph
requires:
  - phase: 06-community-education (plan 01)
    provides: community_replies/community_reply_helpful tables live in Postgres + communityReply.service.test.ts RED contract (deps-injection shape)
  - phase: 06-community-education (plan 04)
    provides: community.controller.ts/community.routes.ts (post endpoints) this plan appends to
provides:
  - POST /api/community/:id/replies (authenticated, create a reply scoped to the caller)
  - GET /api/community/:id/replies (authenticated, replies with COUNT-based helpfulCount + markedByMe)
  - POST /api/community/replies/:replyId/helpful (authenticated, open-access toggle, D-08/D-09)
affects: [06-06, 06-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "communityReply.service.ts's createReply/toggleHelpful accept an optional trailing deps object ({ insert } / { toggle }) defaulting to the real repository, matching the 06-01 RED scaffold's fixed deps-injection contract exactly — listReplies follows the same optional-deps shape for consistency."
    - "findByPost augments each reply with a live COUNT(*) query against community_reply_helpful (helpfulCount) and an existence check for the caller (markedByMe) via Promise.all — no denormalized counter column, matching the aiDailySummary.schema.ts-style join-table precedent from 06-01."

key-files:
  created:
    - backend/src/repositories/communityReply.repository.ts
    - backend/src/services/communityReply.service.ts
  modified:
    - backend/src/controllers/community.controller.ts
    - backend/src/routes/community.routes.ts

key-decisions:
  - "toggleHelpful (service + repository) carries NO userId-ownership WHERE guard tying the mark to the reply's author — any authenticated user may mark any reply as membantu, per D-08's intentional open-access model; the community_reply_helpful unique(reply_id,user_id) constraint from 06-01 is the DB-level dedup backstop, not the toggle's check-then-act logic."
  - "findByPost/listReplies are NOT userId-scoped for visibility (every reader sees every reply for a post) — only markedByMe is per-caller, matching communityPost.repository.ts's precedent of public-read, ownership-scoped-only-for-mutation."
  - "helpfulCount is always computed live via COUNT(*) against community_reply_helpful per reply (N+1 query pattern via Promise.all) rather than a single GROUP BY join — accepted for MVP scale per 06-RESEARCH.md's no-pagination-needed assumption (A4); revisit if reply counts grow large."

requirements-completed: [COMMUNITY-02]

# Metrics
duration: ~20min
completed: 2026-07-04
---

# Phase 06: Community & Education — Plan 05 (Community Reply + "Membantu" Backend) Summary

**Reply creation, reply listing with COUNT-based helpfulCount + markedByMe, and an open-access DB-deduped toggleable "membantu" mark — the 06-01 RED scaffold `communityReply.service.test.ts` is now GREEN (4/4), and the full backend suite shows zero new regressions (11 pre-existing unrelated failures only, down from 12).**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- `communityReply.service.test.ts` (the 06-01 RED scaffold) is now GREEN — all 4 subtests pass: schema validation (valid + empty-isi-rejected), `createReply` persists via injected insert, and `toggleHelpful` round-trips `{marked:true}` then `{marked:false}` for the same (userId, replyId) pair
- `communityReply.repository.ts` exports `createReply`, `findByPost` (COUNT(*) aggregate against `community_reply_helpful` for `helpfulCount` + existence check for `markedByMe`, ordered oldest-first), `toggleHelpful` (check-then-act against the unique join table, no ownership guard per D-08); confirmed via grep zero denormalized counter columns on `communityReply.schema.ts` and zero `encrypt`/`decrypt` imports in the service
- `POST /api/community/:id/replies`, `GET /api/community/:id/replies`, `POST /api/community/replies/:replyId/helpful` mounted at `/api/community`, all behind `authenticate`, delegating through thin controller handlers appended to the existing 06-04 `community.controller.ts`/`community.routes.ts` without disturbing the post handlers
- Full backend suite run confirms zero new regressions: 11 failing tests total = the same 11 pre-existing failures documented in `06-01-SUMMARY.md`/`06-04-SUMMARY.md` (`activity.service.test.ts` x2, `fluidLog _createEntryCore`, `labResult` trend queries x3, `dispatchDueReminders` x4) — down from 12 before this plan (the 12th was `communityReply.service.test.ts` itself, intentionally RED and now flipped GREEN)

## Task Commits

1. **Task 1: communityReply repository + service (reply create, list-with-count, toggle helpful; GREEN test)** - `3fa2f12` (test)
2. **Task 2: Append reply + helpful handlers to community controller and routes** - `608e0ea` (feat)

_Note: Task 1 is committed as `test(...)` because its primary observable outcome is turning the already-committed 06-01 RED scaffold GREEN, consistent with 06-02/06-04's precedent of a single commit per RED-to-GREEN task._

## Files Created/Modified

- `backend/src/repositories/communityReply.repository.ts` - `createReply(data)`, `findByPost(postId, currentUserId)` (non-userId-scoped for visibility, per-reply `helpfulCount`/`markedByMe`), `toggleHelpful(userId, replyId)` (open-access check-then-act, no ownership guard)
- `backend/src/services/communityReply.service.ts` - `createReplySchema` (Zod, isi min1/max2000, Indonesian error messages), `createReply(userId, postId, payload, deps?)`, `listReplies(postId, currentUserId, deps?)`, `toggleHelpful(userId, replyId, deps?)` — no `encrypt`/`decrypt` import
- `backend/src/controllers/community.controller.ts` - appended `createReply`/`listReplies`/`toggleHelpful` thin handlers; existing `createPost`/`listPosts`/`getPost`/`archivePost` handlers untouched
- `backend/src/routes/community.routes.ts` - appended `POST /:id/replies`, `GET /:id/replies`, `POST /replies/:replyId/helpful`, all behind `authenticate`; existing post routes untouched

## Decisions Made

See `key-decisions` in frontmatter. Most notable: `toggleHelpful` deliberately carries zero `userId`-ownership guard (unlike `archivePost`'s IDOR-safe compound WHERE) — this is the D-08 open-access model, not an oversight, and is documented in both the repository and service doc comments so a future reviewer doesn't "fix" it back toward post-author-only marking.

## Deviations from Plan

None — plan executed exactly as written. Both tasks matched their `<action>` specs and all `<acceptance_criteria>` checks passed on first implementation.

## Issues Encountered

- The plan's Task 2 acceptance criterion `grep -c "helpful" backend/src/routes/community.routes.ts` returns 1 undercounts by two: the actual count is 3 because two doc-comment lines (`// GET .../replies — list a post's replies (helpfulCount + markedByMe)` and the route's own descriptive comment) also contain the literal substring "helpful", in addition to the 1 actual route registration. This is the same category of imprecise literal-grep acceptance criteria flagged in `06-04-SUMMARY.md`'s "Issues Encountered" section (that plan's `authenticate` count undercounted for the same reason — doc comments containing the grep target). Verified the actual security requirement (`authenticate` middleware on all three new routes) is met regardless of this count mismatch.
- 11 pre-existing test failures unrelated to Phase 6 remain (see Accomplishments) — confirmed identical to the set documented in `06-01-SUMMARY.md`/`06-04-SUMMARY.md`, not introduced or worsened by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 06-06/06-07 (community feed + post-detail UI) can now build against a working reply/helpful API: `POST /api/community/:id/replies`, `GET /api/community/:id/replies` (returns `helpfulCount`/`markedByMe` per reply), `POST /api/community/replies/:replyId/helpful`.
- COMMUNITY-02 is fully satisfiable at the API layer: authenticated reply creation, reply listing with COUNT-based helpfulCount + markedByMe, and an open-access, DB-deduped, toggleable membantu mark.
- No blockers.

---
*Phase: 06-community-education*
*Completed: 2026-07-04*
