---
phase: 06-community-education
fixed_at: 2026-07-04T13:33:33Z
review_path: .planning/phases/06-community-education/06-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 06: Code Review Fix Report

**Fixed at:** 2026-07-04T13:33:33Z
**Source review:** .planning/phases/06-community-education/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (WR-01 through WR-06; IN-01/IN-02/IN-03 skipped per fix_scope=critical_warning)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### WR-05: `seed-education.ts` delete + insert is not transactional

**Files modified:** `backend/src/seed/seed-education.ts`
**Commit:** `68f49b6`
**Applied fix:** Wrapped the existing select/delete/insert sequence in `db.transaction(async (tx) => { ... })`, using `tx` for all three statements instead of the module-level `db`. A failure during insert now rolls back the delete too, so `education_content` can no longer be left empty by a partially-failed re-seed.

### WR-03: `ReplyItem`'s local toggle state goes stale after list refetch

**Files modified:** `frontend/components/komunitas/ReplyItem.tsx`
**Commit:** `276cd63`
**Applied fix:** Added a `useEffect` keyed on `[reply.markedByMe, reply.helpfulCount]` that resyncs the local `markedByMe`/`helpfulCount` state whenever the `reply` prop's values change (i.e. after `ReplyList` refetches). The effect is a no-op while `isToggling` is true so it doesn't clobber an in-flight optimistic update.

### WR-04: `toggleHelpful` check-then-act has an unhandled race condition

**Files modified:** `backend/src/repositories/communityReply.repository.ts`
**Commit:** `f119d28`
**Applied fix:** Wrapped the `INSERT` branch in a try/catch that checks for Postgres error code `23505` (unique-violation on `uq_community_reply_helpful_reply_user`) and returns `{ marked: true }` instead of rethrowing — a racing double-click/retry/multi-tab insert now resolves as "already marked" rather than surfacing an unhandled 500. Any other error code still rethrows unchanged.

### WR-06: Archived posts remain fully repliable and reachable indefinitely

**Files modified:** `backend/src/services/communityReply.service.ts`, `backend/src/test/communityReply.service.test.ts`
**Commit:** `1b29983`
**Applied fix — decision documented:** Chose to keep `findById`/`getPostDetail` unfiltered (an archived post is still reachable via direct link/bookmark — no change needed, this was already the existing behavior) but **block new replies** against an archived post, which is the least-surprising reading of the archive dialog's copy ("akan disembunyikan dari feed komunitas" — implies the discussion is frozen, not that the post vanishes). `createReply` now takes an injected `findPost` dependency (defaulting to `communityPostRepository.findById`), looks up the target post before inserting, and throws `AppError(404, "NOT_FOUND", ...)` if the post doesn't exist or `AppError(410, "POST_ARCHIVED", ...)` if `diarsipkan` is true. Added two new test cases (reject-on-archived, reject-on-missing-post) and updated the existing passing test to inject a `findPost` stub (required since `CreateReplyDeps.findPost` is now a mandatory field, matching the file's existing deps-injection convention). The frontend's reply-submission catch block was intentionally left as-is — it already shows a generic error toast for any failure mode, which is the same pre-existing pattern flagged separately (and out of scope) by IN-03.

### WR-02: Community feed never returns `replyCount`/`helpfulTotal`

**Files modified:** `backend/src/repositories/communityPost.repository.ts`, `backend/src/services/communityPost.service.ts`
**Commit:** `ec4b417`
**Applied fix:** `findFeed()` now runs a single query with two `LEFT JOIN`s (`community_replies`, then `community_reply_helpful` off the reply) and a `GROUP BY communityPosts.id, users.namaLengkap`, selecting `COUNT(DISTINCT community_replies.id)` as `replyCount` and `COUNT(community_reply_helpful.id)` as `helpfulTotal`. This avoids N+1 (one query total, not one per post) while correctly deduping the join fan-out for the reply count and summing every helpful mark across all of a post's replies for the helpful total. Introduced a new `CommunityFeedItem` type (extends `CommunityPostWithAuthor`) rather than adding the two fields to the shared `CommunityPostWithAuthor` type, since `findById`/`archiveById` don't compute them and the post detail page doesn't render them — `PostCard.tsx`'s existing `post.replyCount ?? 0` / `post.helpfulTotal ?? 0` fallback already handles both the populated (feed) and un-populated (detail, if ever reused) cases without further frontend changes.

### WR-01: Route params passed to UUID columns without format validation

**Files modified:** `backend/src/services/communityPost.service.ts`, `backend/src/services/communityReply.service.ts`, `backend/src/services/educationContent.service.ts`, `backend/src/test/communityPost.service.test.ts`
**Commit:** `442eba4`
**Applied fix:** Added a local `isValidUuid()` helper (`z.string().uuid().safeParse(value).success`) to each of the three service files. `getPostDetail` / `archivePost` / `getContentDetail` now return `null` on a malformed id *before* calling the repository — reusing the exact existing null-return-404 pattern already used by their controllers (`community.controller.ts` / `education.controller.ts`), so no controller changes were needed. `createReply` / `listReplies` / `toggleHelpful` (which have no existing null-return convention) now throw `AppError(404, "NOT_FOUND", ...)` on a malformed `postId`/`replyId`, which `errorHandler` already converts to a proper 404 JSON response instead of the previous unhandled-500 path. `toggleHelpful`'s old dead-code `typeof/length` guard (flagged separately as IN-02, out of scope) was replaced by the real UUID check in the same spot, since it occupied the identical line range this fix needed to touch anyway. `communityPost.service.test.ts`'s in-memory store was updated to hand out `randomUUID()`-shaped ids instead of `"test-post-N"` strings, since its `archivePost` coverage would otherwise short-circuit to `null` on the new format check before ever exercising the ownership logic being tested.

## Verification

- `cd backend && npm test`: 194 tests, 183 pass, 11 fail — the same 5 pre-existing failing suites / 11 failing subtests present before any fixes were applied (`activity schema validation`, `activity _createActivityCore`, `fluidLog _createEntryCore`, `lab trend queries`, `dispatchDueReminders`), all unrelated to phase 06. Two new tests were added by the WR-06 fix and both pass.
- `cd backend && npx tsc --noEmit`: no new errors in any file touched by this pass (remaining errors are pre-existing, confined to `src/test/debug_sql.ts`, `src/test/debug_trace.ts`, `src/test/profile.e2e.ts`, `src/test/reminderDispatch.test.ts` — none of which were touched).
- `cd frontend && npx tsc --noEmit`: clean, no errors.

## Skipped Issues

None — all 6 in-scope findings (WR-01 through WR-06) were fixed. IN-01, IN-02, IN-03 were out of scope for this pass (`fix_scope: critical_warning`) and were not attempted.

---

_Fixed: 2026-07-04T13:33:33Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
