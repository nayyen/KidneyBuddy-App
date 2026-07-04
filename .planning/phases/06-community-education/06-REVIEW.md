---
phase: 06-community-education
reviewed: 2026-07-04T00:00:00Z
depth: standard
files_reviewed: 33
files_reviewed_list:
  - backend/package.json
  - backend/src/app.ts
  - backend/src/controllers/community.controller.ts
  - backend/src/controllers/education.controller.ts
  - backend/src/db/migrations/0011_brown_santa_claus.sql
  - backend/src/db/schema/communityPost.schema.ts
  - backend/src/db/schema/communityReply.schema.ts
  - backend/src/db/schema/communityReplyHelpful.schema.ts
  - backend/src/db/schema/educationContent.schema.ts
  - backend/src/db/schema/index.ts
  - backend/src/repositories/communityPost.repository.ts
  - backend/src/repositories/communityReply.repository.ts
  - backend/src/repositories/educationContent.repository.ts
  - backend/src/routes/community.routes.ts
  - backend/src/routes/education.routes.ts
  - backend/src/seed/seed-education.ts
  - backend/src/services/communityPost.service.ts
  - backend/src/services/communityReply.service.ts
  - backend/src/services/educationContent.service.ts
  - backend/src/test/communityPost.service.test.ts
  - backend/src/test/communityReply.service.test.ts
  - backend/src/test/educationContent.service.test.ts
  - "frontend/app/(app)/edukasi/komunitas/[id]/page.tsx"
  - "frontend/app/(app)/edukasi/komunitas/page.tsx"
  - "frontend/app/(app)/edukasi/page.tsx"
  - frontend/components/edukasi/EducationCard.tsx
  - frontend/components/edukasi/EducationDetail.tsx
  - frontend/components/edukasi/EducationList.tsx
  - frontend/components/edukasi/EdukasiSubNav.tsx
  - frontend/components/komunitas/CommunityFeed.tsx
  - frontend/components/komunitas/CreatePostSheet.tsx
  - frontend/components/komunitas/PostCard.tsx
  - frontend/components/komunitas/PostDetail.tsx
  - frontend/components/komunitas/ReplyItem.tsx
  - frontend/components/komunitas/ReplyList.tsx
findings:
  critical: 0
  warning: 6
  info: 3
  total: 9
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-07-04T00:00:00Z
**Depth:** standard
**Files Reviewed:** 33
**Status:** issues_found

## Summary

Reviewed the community forum (COMMUNITY-01/02/03) and education content browsing (EDU-01) feature set across backend (schema, repository, service, controller, routes, seed) and frontend (pages + components). Overall the code follows the codebase's established repository/service/controller layering, uses parameterized Drizzle queries (no SQL injection surface), never uses `dangerouslySetInnerHTML`/`innerHTML` for user-generated `judul`/`isi`/reply content (XSS-safe by relying on React's default text-child escaping), and correctly derives IDOR-sensitive flags (`isMine`, archive ownership) server-side rather than trusting client input.

No BLOCKER-level security vulnerabilities, injection flaws, or data-loss-causing bugs were found. However, several correctness and robustness gaps should be fixed:

- Route params (`:id`, `:replyId`) are passed straight into Postgres UUID-typed columns without format validation, so malformed/garbage IDs produce a raw Postgres error that falls through to a generic 500 instead of a clean 404/400.
- The community feed's `replyCount`/`helpfulTotal` fields are never populated by the backend, so `PostCard` always renders "0" for both counters regardless of actual engagement — misleading users about how live the community is.
- `ReplyItem`'s "membantu" toggle state is seeded once from props via `useState` and never resynced when the parent list refetches, so its displayed count/mark can silently go stale after other users interact with the same reply.
- The reply-helpful toggle's check-then-act repository logic has a benign race condition (double-click / retry can hit the DB's unique-constraint on insert, surfacing as an unhandled 500).
- `seed-education.ts` deletes all rows before re-inserting without wrapping both in a transaction, risking an empty `education_content` table if the insert step fails partway.

None of these block core functionality under normal single-user usage, but they should be fixed before this phase is considered done.

## Warnings

### WR-01: Route params passed to UUID columns without format validation → 500 instead of 404/400

**File:** `backend/src/controllers/community.controller.ts:58-101, 107-163`, `backend/src/controllers/education.controller.ts:40-55`, `backend/src/repositories/communityPost.repository.ts:69-94`, `backend/src/repositories/communityReply.repository.ts:59-129`, `backend/src/repositories/educationContent.repository.ts:51-58`

**Issue:** `req.params.id` / `req.params.replyId` are passed directly into Drizzle `eq(table.id, id)` clauses where the column is `uuid`. If a client sends a non-UUID string (e.g. a stray `/edukasi/komunitas/undefined` navigation, a bookmarked stale link, or any malformed id), Postgres throws `invalid input syntax for type uuid`. This error is neither a `ZodError` nor an `AppError`, so it falls through `errorHandler`'s final branch and returns a generic `500 INTERNAL_ERROR` to the client instead of the intended `404 NOT_FOUND` (for `getPost`/`getById`/`archivePost`) or a `400` validation error. The same applies to `createReply`/`toggleHelpful` when `postId`/`replyId` don't correspond to any row and hit a foreign-key violation on insert.

This is a real-world-reachable path: the frontend's `PostDetailPage` reads `params.id` directly from the URL with no validation before calling the API (`frontend/app/(app)/edukasi/komunitas/[id]/page.tsx:18`), so any mistyped or stale bookmark produces a confusing 500 error rather than the app's "Postingan tidak ditemukan" empty state.

**Fix:** Validate the `:id`/`:replyId` route params as UUIDs before hitting the repository (e.g. `z.string().uuid()` at the controller/service boundary, or an Express param validator), and return 404/400 on mismatch instead of letting the raw driver error propagate:
```ts
const idSchema = z.string().uuid();
export async function getPost(req, res, next) {
  try {
    const parseResult = idSchema.safeParse(req.params.id);
    if (!parseResult.success) {
      res.status(404).json({ code: "NOT_FOUND", message: "Postingan tidak ditemukan" });
      return;
    }
    // ... existing logic
  } catch (err) { next(err); }
}
```

### WR-02: Community feed never returns `replyCount`/`helpfulTotal` — PostCard always displays 0

**File:** `backend/src/repositories/communityPost.repository.ts:44-63` (feed query), `frontend/components/komunitas/PostCard.tsx:80-81, 148-163`

**Issue:** `findFeed()` selects only `getTableColumns(communityPosts)` plus a joined `authorName` — there is no `replyCount` or `helpfulTotal` aggregate anywhere in the query or in `CommunityPostWithAuthor`. `PostCard.tsx` reads `post.replyCount ?? 0` and `post.helpfulTotal ?? 0`, so both values are always `undefined` from the API and always render as literal `0` in the feed footer for every post, regardless of how many replies or "membantu" marks actually exist. This misrepresents community activity to every user browsing the feed (e.g. a post with 20 replies still shows "0" next to the message icon), which actively discourages engagement — the opposite of the intended UX.

**Fix:** Either compute and return these aggregates from the repository (e.g. `LEFT JOIN` + `COUNT(DISTINCT community_replies.id)` and a helpful-count subquery), or remove the `replyCount`/`helpfulTotal` UI elements from `PostCard` until the backend actually supplies them, so the feed doesn't show incorrect data:
```ts
// repository: aggregate reply count alongside the feed query, e.g.
.leftJoin(communityReplies, eq(communityReplies.postId, communityPosts.id))
.groupBy(communityPosts.id, users.namaLengkap)
```

### WR-03: `ReplyItem`'s local toggle state goes stale after list refetch (no prop resync)

**File:** `frontend/components/komunitas/ReplyItem.tsx:52-53`

**Issue:** `markedByMe`/`helpfulCount` are initialized once via `useState(reply.markedByMe)` / `useState(reply.helpfulCount)`. `ReplyList` refetches replies whenever `refreshKey` changes (after the current user posts a new reply — `PostDetail.tsx:138`), producing a brand-new `replies` array from the server. Because existing `ReplyItem` components are keyed by the same `reply.id` (`ReplyList.tsx:93`), React reuses the same component instance for unchanged replies and does **not** re-initialize `useState`'s value from the new props. If another user has "membantu"-marked/unmarked one of the already-rendered replies in the interim, the visible count and mark will not reflect the newly-fetched server value — the reply appears stuck with outdated info until a full page reload.

**Fix:** Sync local state to prop changes with a `useEffect`, or drop local mirrored state in favor of directly deriving from props with optimistic overrides tracked separately:
```ts
useEffect(() => {
  setMarkedByMe(reply.markedByMe);
  setHelpfulCount(reply.helpfulCount);
}, [reply.markedByMe, reply.helpfulCount]);
```

### WR-04: `toggleHelpful` check-then-act has an unhandled race condition on the unique constraint

**File:** `backend/src/repositories/communityReply.repository.ts:100-129`

**Issue:** The toggle is implemented as "SELECT existing → DELETE if found, else INSERT" with no transaction/locking and no handling of the DB-level unique-constraint violation (`uq_community_reply_helpful_reply_user`). Two near-simultaneous requests for the same `(userId, replyId)` pair (e.g. a double-click before `isToggling` disables the button, a network retry, or two open tabs) can both read "no existing row", then both attempt `INSERT`, and the second insert throws a Postgres unique-violation error. This error is not caught anywhere in the repository/service/controller chain, so it propagates to the generic `errorHandler` and returns an unhandled `500` to the user for what is, from the user's perspective, an ordinary double-tap.

**Fix:** Wrap the check-then-act in a transaction with a row lock, or catch the unique-violation error code (`23505`) and treat it as "already marked" (return `{ marked: true }`) instead of surfacing a 500:
```ts
try {
  await db.insert(communityReplyHelpful).values({ userId, replyId });
  return { marked: true };
} catch (err: any) {
  if (err.code === "23505") return { marked: true }; // already marked by a racing request
  throw err;
}
```

### WR-05: `seed-education.ts` delete + insert is not transactional — insert failure leaves the table empty

**File:** `backend/src/seed/seed-education.ts:169-179`

**Issue:** `main()` does `await db.delete(educationContent)` followed by `await db.insert(educationContent).values(articles)` as two independent statements, not wrapped in `db.transaction()`. If the insert fails partway (e.g. a constraint violation on a future article addition, a dropped DB connection, or the process being killed mid-run), the delete has already committed and the table is left empty — every user loses access to all education content until the script is re-run successfully. Given EDU-01 is core educational content shown on every visit to `/edukasi`, this is a meaningful availability risk for what should be a safe, idempotent maintenance script.

**Fix:**
```ts
await db.transaction(async (tx) => {
  const existing = await tx.select({ id: educationContent.id }).from(educationContent);
  if (existing.length > 0) await tx.delete(educationContent);
  await tx.insert(educationContent).values(articles);
});
```

### WR-06: Archived posts remain fully repliable and their detail page stays reachable indefinitely

**File:** `backend/src/repositories/communityPost.repository.ts:69-77` (`findById` has no `diarsipkan` filter), `backend/src/services/communityReply.service.ts:65-80` (`createReply` has no archived-post check)

**Issue:** `findById()` (used by `getPostDetail`) does not filter on `diarsipkan`, and `createReply` never checks whether the target post is archived before inserting a reply. This means once a user archives their post (intending to remove it from visibility per the confirmation dialog's copy "akan disembunyikan dari feed komunitas"), the post detail page remains fully loadable via direct link/bookmark, and — more importantly — other users can continue posting new replies to an archived post indefinitely. This is inconsistent with the likely intent of "archiving" a discussion (freeze it) and could surprise the archiving user who returns to find new replies on a post they believed was retired.

**Fix:** Decide the intended semantics explicitly and enforce them server-side: either block new replies on archived posts (`if (post.diarsipkan) throw new AppError(410, "POST_ARCHIVED", ...)` in `createReply`), or document that archived posts remain fully live via direct link (in which case, update the archive confirmation copy to avoid implying otherwise).

## Info

### IN-01: Zod enum validation falls back to English default message for actual invalid-enum values

**File:** `backend/src/services/communityPost.service.ts:43-50`, `backend/src/services/educationContent.service.ts:26-27`

**Issue:** `z.enum([...], { required_error, invalid_type_error })` only overrides the "missing" and "wrong-type" cases with Bahasa Indonesia messages. If a value of the correct type but not in the enum set is sent (e.g. `kategori: "spam"` from a tampered/malicious request bypassing the client's pill selector), Zod falls back to its untranslated default message ("Invalid enum value. Expected ..."). Given CLAUDE.md's "Seluruh UI dan konten edukasi dalam Bahasa Indonesia awam" constraint, this is a minor localization gap on an edge case (only reachable via a non-UI client).

**Fix:** Supply a custom `errorMap` on the enum schema, or catch `ZodError` centrally and re-map generic i18n messages.

### IN-02: `toggleHelpful` service's `replyId` type guard is unreachable dead code

**File:** `backend/src/services/communityReply.service.ts:108-110`

**Issue:** `if (typeof replyId !== "string" || replyId.length === 0) throw new Error(...)` can never trigger through the real request path: Express route params (`req.params.replyId`) are always non-empty strings by construction (an empty segment wouldn't match the route pattern at all). The check only guards against a caller mis-invoking the service function directly with wrong types (e.g. from tests), which is already caught by TypeScript's type system at compile time in production code.

**Fix:** Either remove the redundant runtime check, or replace it with the UUID-format validation described in WR-01 (which would make it meaningful).

### IN-03: Frontend `authFetch` failures collapse distinct error causes (network vs 401 vs validation) into one generic toast/error state

**File:** `frontend/components/komunitas/CreatePostSheet.tsx:97-99`, `frontend/components/komunitas/CommunityFeed.tsx:67-68`, `frontend/components/edukasi/EducationList.tsx:48-49`, `frontend/components/komunitas/PostDetail.tsx:139-140, 154-155`

**Issue:** All these `catch` blocks show the same generic "Gagal mengirim/memuat konten. Periksa koneksi internet Anda..." message regardless of whether the failure was a network error, a session-expiry (401 with failed refresh), or a server-side validation rejection. A user whose session has expired mid-session (refresh token invalid/expired) will see a network-sounding error and may retry indefinitely rather than being redirected to log in again.

**Fix:** Distinguish `ApiError` status codes in the catch blocks (e.g. redirect to `/login` on a persistent 401) rather than a single blanket message for every failure mode. This is a UX polish item, not a functional break, since the existing behavior is consistent with other pages in the app.

---

_Reviewed: 2026-07-04T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
