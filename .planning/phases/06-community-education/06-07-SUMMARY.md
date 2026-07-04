---
phase: 06-community-education
plan: 07
subsystem: ui
tags: [nextjs, react, express, drizzle, community]

# Dependency graph
requires:
  - phase: 06-community-education (plan 05)
    provides: POST/GET /api/community/:id/replies, POST /api/community/replies/:replyId/helpful (helpfulCount + markedByMe)
  - phase: 06-community-education (plan 06)
    provides: CommunityFeed/PostCard linking to /edukasi/komunitas/[id], communityPost authorName-join precedent
provides:
  - "Bookmarkable post detail route /edukasi/komunitas/[id] (D-03)"
  - "PostDetail, ReplyList, ReplyItem components"
  - "Working reply composer, optimistic 'Tandai Membantu' toggle, owner-only archive dialog"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PostDetail lifts a replyRefreshKey number state, incremented after a successful reply POST and passed to ReplyList as a prop dependency — avoids needing an imperative ref/forwardRef to trigger a child refetch."
    - "ReplyItem mirrors AlertHistoryList.tsx's optimistic-toggle-then-revert-on-failure pattern for the 'Tandai Membantu' mark, adjusting both markedByMe and helpfulCount together in local state before the network call resolves."

key-files:
  created:
    - frontend/app/(app)/edukasi/komunitas/[id]/page.tsx
    - frontend/components/komunitas/PostDetail.tsx
    - frontend/components/komunitas/ReplyList.tsx
    - frontend/components/komunitas/ReplyItem.tsx
  modified:
    - backend/src/repositories/communityReply.repository.ts

key-decisions:
  - "communityReply.repository.ts's findByPost now left-joins users to attach authorName (CommunityReplyWithMeta), the same Rule 2 precedent 06-06 established for communityPost.repository.ts's findFeed/findById — a reply thread with zero author attribution is a real UX gap in a Quora-style community, not cosmetic. toggleHelpful's intentionally ungated D-08 open-access logic was left untouched."
  - "Archive control visibility is driven entirely by the server-derived isMine flag from 06-04's getPostDetail — never a client-held flag — so a stale/tampered client state cannot surface an archive button for a post the caller doesn't own; the server's compound-WHERE IDOR check in archiveById remains the actual authority regardless of what renders."

requirements-completed: [COMMUNITY-02, COMMUNITY-03]

# Metrics
duration: ~45min
completed: 2026-07-04
---

# Phase 06: Community & Education — Plan 07 (Post Detail + Replies + Membantu + Archive UI) Summary

**Bookmarkable post detail page at `/edukasi/komunitas/[id]` with a working reply composer, an any-user optimistic "Tandai Membantu" toggle, and an owner-only archive-not-delete confirmation — verified end-to-end against the live backend via a full create → reply → mark/unmark → archive → feed-hides lifecycle, completing the interactive half of COMMUNITY-03 and all of COMMUNITY-02.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 2
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments

- `frontend/app/(app)/edukasi/komunitas/[id]/page.tsx` — new dynamic route (D-03) reusing the exact `/edukasi/komunitas` auth-guard boilerplate (`useAuth`, redirect to `/login`, "Memuat..." loading state), reading the post id via `useParams()` and delegating to `<PostDetail>`.
- `PostDetail.tsx` fetches `GET /api/community/:id` (including the 06-04 server-derived `isMine` flag) and renders: author avatar/name/relative-timestamp, judul as Display (18px/700), full `isi` as a plain JSX text child with `whitespace-pre-wrap` (zero `dangerouslySetInnerHTML` — T-06-18), category + therapy badges, a reply composer (`Textarea` + "Kirim Balasan" button, accent `#2a9d8f`, 44px height) that `POST`s `/api/community/:id/replies` and bumps a `replyRefreshKey` to refetch `<ReplyList>` on success, and — only when `post.isMine` is true — an `Archive` icon button opening an `AlertDialog` ("Arsipkan Postingan?" / "Postingan ini akan disembunyikan dari feed komunitas dan tidak dapat dipulihkan sendiri. Balasan yang sudah ada akan tetap tersimpan." / "Batal" / "Arsipkan" destructive `#d4183d`) that `PATCH`es `/api/community/:id/archive` and `router.push`es back to `/edukasi/komunitas` on success. Loading, "Postingan tidak ditemukan" (404), and generic error+retry states are all handled.
- `ReplyList.tsx` fetches `GET /api/community/:id/replies`, re-running whenever its `refreshKey` prop changes; renders "Memuat...", an error block with "Coba Lagi", the "Belum Ada Balasan" / "Jadilah yang pertama membalas postingan ini." empty state, or a list of `<ReplyItem>`.
- `ReplyItem.tsx` renders each reply's author/timestamp and body (plain JSX text child, `whitespace-pre-wrap`, zero `dangerouslySetInnerHTML`) plus a "Tandai Membantu" toggle: any authenticated user (D-08, not gated on reply authorship) can click it to optimistically flip `markedByMe` and adjust `helpfulCount` by ±1, then `POST /api/community/replies/:replyId/helpful`; on failure both values revert (mirrors `AlertHistoryList.tsx`'s `handleCardClick` revert-on-failure pattern).
- **Deviation (Rule 2 — missing critical functionality):** `communityReply.repository.ts`'s `findByPost` had zero author attribution (only a raw `userId`) — the plan's own Task 2 action text specified ReplyItem should render "author + timestamp," but the 06-05 API never joined to `users`. Added a `leftJoin(users, eq(communityReplies.userId, users.userId))` selecting `users.namaLengkap as authorName` via `getTableColumns(communityReplies)` spread, exported as an updated `CommunityReplyWithMeta` type including `authorName: string | null`. `toggleHelpful` (the D-08 intentionally-ungated open-access logic) was left untouched.
- Verified end-to-end against the live stack: rebuilt both `kidneybuddy-frontend` and `kidneybuddy-backend` Docker images (`docker compose build frontend backend`) and recreated both containers (`docker compose up -d frontend backend`); confirmed clean startup logs (migrations ran, scheduler started, zero errors) and a `200` response from `GET /edukasi/komunitas/[id]` in the browser-facing container. Ran a real login (`lukman@kidneybuddy.demo`) against the live backend and exercised the full lifecycle via direct API calls: (1) created a real post via `POST /api/community`, (2) fetched its detail via `GET /api/community/:id` confirming `authorName: "Lukman Hakim"` and `isMine: true`, (3) posted a reply via `POST /api/community/:id/replies` and confirmed `GET /api/community/:id/replies` returned it with `authorName` populated (the 06-07 repository join), (4) toggled `POST /api/community/replies/:replyId/helpful` twice, confirming `helpfulCount`/`markedByMe` flip from `0`/`false` → `1`/`true` → `0`/`false` across `GET` re-fetches, (5) archived the post via `PATCH /api/community/:id/archive` and confirmed it both disappeared from `GET /api/community` (the feed) and remained directly fetchable via `GET /api/community/:id` (archive, not delete). Cleaned up the verification post/reply/helpful-mark rows afterward via direct SQL delete (not through the app). Full backend suite re-run: 181/192 passing, the same 11 pre-existing unrelated failures documented in every prior 06-xx summary (activity/fluidLog/lab-trend/dispatchDueReminders) — zero new regressions.

## Task Commits

1. **Task 1: Dynamic post detail route + PostDetail (full body, reply composer, archive dialog)** - `d9c0ead` (feat)
2. **Task 2: ReplyList + ReplyItem with optimistic 'Tandai Membantu' toggle** - `288f45a` (feat) — includes the backend authorName-join deviation

## Files Created/Modified

- `frontend/app/(app)/edukasi/komunitas/[id]/page.tsx` - new dynamic route (D-03), auth-guard boilerplate + `useParams()` + `<PostDetail>`
- `frontend/components/komunitas/PostDetail.tsx` - full post view, reply composer, owner-only archive `AlertDialog`, loading/error/404 states
- `frontend/components/komunitas/ReplyList.tsx` - reply fetch + refetch-on-`refreshKey`, loading/error/empty states
- `frontend/components/komunitas/ReplyItem.tsx` - reply render + optimistic any-user "Tandai Membantu" toggle with revert-on-failure
- `backend/src/repositories/communityReply.repository.ts` - `findByPost` now left-joins `users` for `authorName`; `CommunityReplyWithMeta` type updated

## Decisions Made

See `key-decisions` in frontmatter. Most notable: the archive control's visibility is driven exclusively by the server-derived `isMine` flag returned from `GET /api/community/:id` — the component never computes or trusts a client-side ownership check, so the UI cannot be tricked into offering an archive action for a post the caller doesn't own even if client state were tampered with; the server's IDOR-safe compound `WHERE (userId, id)` in `archiveById` remains the actual enforcement point regardless.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added authorName to community replies via a users join**
- **Found during:** Task 2 (ReplyItem) implementation — the plan's action text specified ReplyItem should render "author + timestamp," but `GET /api/community/:id/replies`'s 06-05 response shape had no author field (only a raw `userId`).
- **Issue:** A Quora-style reply thread with zero author attribution on any reply is a real product gap, matching the exact same class of issue 06-06 found and fixed for posts one plan earlier.
- **Fix:** Modified `communityReply.repository.ts`'s `findByPost` to `leftJoin` the `users` table and select `users.namaLengkap as authorName`, using `getTableColumns(communityReplies)` to spread the original columns unchanged. Updated the exported `CommunityReplyWithMeta` type accordingly. `toggleHelpful` (the D-08 open-access logic) was not touched.
- **Files modified:** `backend/src/repositories/communityReply.repository.ts`
- **Verification:** `cd backend && npx tsc --noEmit` shows zero community/Reply-related errors (only 11 pre-existing unrelated failures across other files); full backend suite re-run shows the same 11 pre-existing failures (zero new); `communityReply.service.test.ts` unaffected since it never exercises `findByPost` directly; live end-to-end test against the running backend confirmed `authorName: "Lukman Hakim"` appears on a real reply after posting one as that user.
- **Committed in:** `288f45a` (Task 2's commit, since ReplyItem is the first consumer of the reply response shape).

---

**Total deviations:** 1 (backend join fix for a real missing-functionality gap, matching 06-06's precedent exactly)
**Impact on plan:** ReplyItem now genuinely shows real reply author names end-to-end rather than a permanent "Anggota Komunitas" fallback for every reply; no scope creep beyond what the plan's own Task 2 action text already required.

## Issues Encountered

- A local `npm run build` initially failed with `Cannot find module '@serwist/utils'` while collecting page data for `/serwist/[path]` — traced to a stale `.next` build cache (the module resolved fine via direct `node -e "require.resolve(...)"` and via ESM dynamic `import()`, confirming the package itself was intact on disk). `rm -rf .next && npm run build` resolved it cleanly on the next attempt with zero errors, including the new `/edukasi/komunitas/[id]` dynamic route appearing in the route manifest. This was an environment/cache artifact unrelated to any file this plan touched (no `next.config.ts`, `package.json`, or serwist file was modified) — not logged as a plan deviation since no source file changed to fix it.
- 11 pre-existing/unrelated backend test failures remain (activity.service.test.ts x2, fluidLog `_createEntryCore`, labResult trend queries x3, `dispatchDueReminders` x4) — same set documented in every prior 06-xx summary, none introduced or worsened by this plan.
- No interactive-browser tool is available in this execution environment to visually screenshot `/edukasi/komunitas/[id]`. Verification was instead performed via: (1) `next build` succeeding with zero errors and the dynamic route registered, (2) `npx tsc --noEmit` clean for all community-related files, (3) full Docker rebuild + restart of both `kidneybuddy-frontend`/`kidneybuddy-backend` with clean startup logs, (4) a `200` response from the actual `/edukasi/komunitas/[id]` route in the running container, and (5) real login + `POST`/`GET`/`PATCH` calls against the live backend confirming the complete create-post → view-detail → reply → toggle-helpful (mark and unmark) → archive → feed-hides-but-detail-still-fetchable lifecycle works end-to-end with real data (not mocked). A human should still do a final pixel-level visual pass (375px/1024px breakpoints) per the plan's `<human-check>` verification line.

## Known Stubs

None. `PostCard.tsx`'s deferred `replyCount`/`helpfulTotal` feed-level aggregates (flagged as a stub in `06-06-SUMMARY.md`) remain out of this plan's scope — the plan's own text explicitly deferred them and this plan's detail-page reply list already surfaces real per-reply `helpfulCount` independently of that feed-level aggregate.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- COMMUNITY-02 is now fully demoable end-to-end: authenticated reply creation, reply listing with live `helpfulCount`/`markedByMe`, and an open-access, DB-deduped, optimistically-toggled "membantu" mark, all rendered in the browser.
- COMMUNITY-03's interactive half (archive own post, never hard-delete) is now demoable end-to-end from the UI: an owner-only confirmation dialog that archives and returns to the feed.
- This is the final plan (06-07) of Phase 6 (Community & Education) — all 7 plans (06-01 through 06-07) are now complete. No blockers carried forward.
- A future iteration could surface real `replyCount`/`helpfulTotal` back into the feed view (`PostCard.tsx`'s current `0` fallback) via a lightweight aggregate in `findFeed`, as `06-06-SUMMARY.md`'s "Next Phase Readiness" section already noted — not required for Phase 6's scope.

---
*Phase: 06-community-education*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 5 created/modified files and both task commit hashes (`d9c0ead`, `288f45a`) verified present on disk / in git history.
