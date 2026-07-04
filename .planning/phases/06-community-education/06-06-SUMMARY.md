---
phase: 06-community-education
plan: 06
subsystem: ui
tags: [nextjs, react, react-hook-form, zod, community]

# Dependency graph
requires:
  - phase: 06-community-education (plan 03)
    provides: EdukasiSubNav shared pill sub-nav + /edukasi/komunitas placeholder route
  - phase: 06-community-education (plan 04)
    provides: POST/GET /api/community, GET /api/community/:id, PATCH /api/community/:id/archive
provides:
  - "/edukasi/komunitas real, filterable, newest-first community feed replacing the 06-03 placeholder"
  - "CommunityFeed, PostCard, CreatePostSheet components"
affects: [06-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CreatePostSheet mirrors MedicationReminderForm.tsx's react-hook-form + @hookform/resolvers/zod convention (Controller-driven pill selectors submitting enum values, not display labels)"
    - "CommunityFeed refetches server-side on filter change (URLSearchParams-built query string), never client .filter()/.sort() — same pattern as EducationList.tsx"

key-files:
  created:
    - frontend/components/komunitas/CommunityFeed.tsx
    - frontend/components/komunitas/PostCard.tsx
    - frontend/components/komunitas/CreatePostSheet.tsx
  modified:
    - frontend/app/(app)/edukasi/komunitas/page.tsx
    - backend/src/repositories/communityPost.repository.ts
    - backend/src/services/communityPost.service.ts

key-decisions:
  - "communityPost.repository.ts's findFeed/findById now left-join users to attach authorName (CommunityPostWithAuthor type) — the 06-04 API returned zero author attribution, a real product gap for a Quora-style feed (Rule 2 deviation), not a cosmetic one. The join is read-only and does not touch the IDOR-safe archiveById path."
  - "PostCard renders replyCount/helpfulTotal with a defensive 0 fallback and authorName with a 'Anggota Komunitas' fallback — the feed API does not yet return reply/helpful aggregates (06-07 scope) or guarantee authorName is non-null (user soft-delete edge case)."

requirements-completed: [COMMUNITY-01, COMMUNITY-03]

# Metrics
duration: ~45min
completed: 2026-07-04
---

# Phase 06: Community & Education — Plan 06 (Community Feed Frontend) Summary

**Real, filterable, newest-first community feed at /edukasi/komunitas (category + therapy pill-chip filters, defaulting to all posts per D-06) with a working "Buat Postingan" composer, replacing the 06-03 placeholder — verified end-to-end against the live 06-04 backend including a backend fix that attaches real author names to the previously-anonymous feed.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 3
- **Files modified:** 6 (3 created, 3 modified — 1 frontend page + 2 backend files as a deviation)

## Accomplishments

- `CommunityFeed.tsx` fetches `GET /api/community` with server-side `kategori`/`metodeTerapi` query params built from two independent pill-chip filter rows (category: Semua/Pertanyaan/Berbagi Pengalaman/Informasi; therapy: Semua/CAPD/HD/Transplantasi/Umum), refetching on any filter change; default state on load sends **no** query params, showing all posts regardless of the viewer's own therapy method (D-06). Renders "Memuat...", an error block with "Coba Lagi" retry, the "Belum Ada Diskusi" empty state, and a "Buat Postingan" CTA (accent `#2a9d8f`, height 44px) that opens `CreatePostSheet` and refetches on success. No client-side `.sort()` — relies entirely on the API's newest-first ordering (D-07).
- `PostCard.tsx` renders each feed item as a `next/link`-wrapped card: avatar + author name + relative timestamp, judul (Heading 14/700), isi preview as a plain JSX text child with `whitespace-pre-wrap line-clamp-2` (zero `dangerouslySetInnerHTML` occurrences — T-06-15), a category badge and a therapy-tag badge using the exact established UI-SPEC colors (CAPD teal/HD amber/Transplantasi purple/Umum neutral), and a footer with reply-count + membantu-count (defensive 0 fallback, refined in 06-07).
- `CreatePostSheet.tsx` mirrors `MedicationReminderForm.tsx`'s react-hook-form + zod convention: `Input` (judul, max 200), `Textarea` (isi, max 5000), and two `Controller`-driven pill-selector groups for kategori (submitting the `pertanyaan|berbagi_pengalaman|informasi` enum values, never display labels) and metodeTerapi (CAPD/HD/Transplantasi/Umum). Client zod schema mirrors the server's `createPostSchema` max-length constraints for fail-fast inline validation (T-06-17). On success, calls `onCreated()` (closes sheet, triggers feed refetch) and resets the form; on failure shows `toast.error("Gagal mengirim. Periksa koneksi internet Anda dan coba lagi.")`.
- `komunitas/page.tsx` replaces the 06-03 "Diskusi sesama pasien akan tersedia di update berikutnya" placeholder body with `<CommunityFeed accessToken={accessToken} />`, keeping `EdukasiSubNav` and the exact `/login` auth-guard boilerplate from `/edukasi`.
- **Deviation (Rule 2 — missing critical functionality):** `communityPost.repository.ts`'s `findFeed`/`findById` did not join to `users` at all in the 06-04 backend, meaning the feed API returned zero author attribution — every post would have rendered as anonymous in a Quora-style community, a genuine product-correctness gap rather than a cosmetic one. Added a `leftJoin(users, eq(communityPosts.userId, users.userId))` selecting `users.namaLengkap as authorName` via `getTableColumns(communityPosts)` spread, exported as a new `CommunityPostWithAuthor` type. `archiveById` (the only userId-scoped/IDOR-sensitive query) was left untouched.
- Verified end-to-end against the live stack: rebuilt and restarted the `kidneybuddy-frontend` production container (bakes a `next build`, confirmed `/edukasi/komunitas` statically generated with zero build errors) and restarted `kidneybuddy-backend` (volume-mounted `src/` but no file-watcher, so the repository/service edits required a manual restart — confirmed via startup logs: migrations ran, server listening, scheduler started, zero errors). Ran a real login (`lukman@kidneybuddy.demo`) against the live backend, then: (1) confirmed `GET /api/community` initially returned `{"posts":[]}`, (2) created a real post via `POST /api/community` and confirmed it appeared in the unfiltered feed **with `authorName: "Lukman Hakim"`** populated by the new join, (3) confirmed `GET /api/community?metodeTerapi=HD` and `?kategori=informasi` both correctly returned `{"posts":[]}` (server-side filtering genuinely narrows results, doesn't just decorate the same list), (4) archived the post via `PATCH /api/community/:id/archive` and confirmed the feed subsequently returned `{"posts":[]}` again — archived posts are absent from the feed (COMMUNITY-03 visible half). Cleaned up the verification post afterward via direct SQL delete (not through the app — the app itself never hard-deletes, per COMMUNITY-03). Full backend suite re-run after the repository change: 181/192 passing, the same 11 pre-existing unrelated failures documented in prior summaries (activity/fluidLog/lab-trend/dispatchDueReminders) — zero new regressions, and `communityPost.service.test.ts` + `communityReply.service.test.ts` both remain 10/10 green.

## Task Commits

1. **Task 1: CommunityFeed with category + therapy filters, wired into komunitas page** - `6b7fbc0` (feat) — includes the backend authorName-join deviation
2. **Task 2: PostCard preview component** - `883d7cf` (feat)
3. **Task 3: CreatePostSheet composer** - `7f822a8` (feat)

## Files Created/Modified

- `frontend/components/komunitas/CommunityFeed.tsx` - feed fetch + category/therapy filters + "Buat Postingan" CTA + loading/error/empty states
- `frontend/components/komunitas/PostCard.tsx` - post preview card (author, timestamp, judul, isi preview, category/therapy badges, reply/membantu counts), exports `PostItem` type
- `frontend/components/komunitas/CreatePostSheet.tsx` - post composer (title/content/category/therapy pill selectors)
- `frontend/app/(app)/edukasi/komunitas/page.tsx` - mounts `CommunityFeed` in place of the 06-03 placeholder
- `backend/src/repositories/communityPost.repository.ts` - `findFeed`/`findById` now left-join `users` for `authorName`; new `CommunityPostWithAuthor` exported type
- `backend/src/services/communityPost.service.ts` - type updates (`CommunityPostWithAuthor`) to match the repository's new return shape; no behavioral change to validation/create/archive logic

## Decisions Made

See `key-decisions` in frontmatter. Most notable: the authorName join is a deviation from the plan's declared `files_modified` list (which only listed frontend files) but was necessary to satisfy Task 2's explicit "author display name" requirement — without it, every post in the feed would render as anonymous, which is a real UX/product defect for a peer-support community, not a stylistic gap. The fix is minimal (a single left-join, no new tables, no schema migration) and was verified not to break the existing `communityPost.service.test.ts` RED-to-GREEN contract from 06-04 (still 6/6 green) or introduce any IDOR risk (the ownership-scoped `archiveById` query was left untouched).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added authorName to the community feed/detail API via a users join**
- **Found during:** Task 2 (PostCard) implementation — the plan's action text specified PostCard should show "author display name," but `GET /api/community`'s 06-04 response shape had no author field at all (only a raw `userId`).
- **Issue:** A Quora-style community feed with zero author attribution is a real product gap, not a cosmetic detail — users would not know who wrote any post.
- **Fix:** Modified `communityPost.repository.ts`'s `findFeed` and `findById` to `leftJoin` the `users` table and select `users.namaLengkap as authorName`, using `getTableColumns(communityPosts)` to spread the original columns unchanged. Updated `communityPost.service.ts`'s return types (`CommunityPostWithAuthor`) accordingly. `archiveById` (the IDOR-sensitive, userId-scoped mutation) was not touched.
- **Files modified:** `backend/src/repositories/communityPost.repository.ts`, `backend/src/services/communityPost.service.ts`
- **Verification:** `cd backend && npx tsc --noEmit` clean; `communityPost.service.test.ts` still 6/6 green; full backend suite re-run shows the same 11 pre-existing failures (zero new); live end-to-end test against the running backend confirmed `authorName: "Lukman Hakim"` appears in the real feed response after creating a post as that user.
- **Committed in:** `6b7fbc0` (Task 1's commit, since CommunityFeed is the first consumer of the feed response shape)

**2. [Rule 1 - Bug] Reworded an inline comment to avoid tripping the plan's own `dangerouslySetInnerHTML` grep check**
- **Found during:** Task 2 acceptance-criteria verification (`grep -c "dangerouslySetInnerHTML" frontend/components/komunitas/PostCard.tsx` initially returned `1`)
- **Issue:** An inline comment above the isi-preview render read "never dangerouslySetInnerHTML" — correct in meaning but tripped the plan's literal grep-based acceptance check, same class of self-inflicted false positive documented in 06-03/06-04's summaries.
- **Fix:** Reworded to "no raw-HTML injection API" (same phrasing convention established in 06-03).
- **Files modified:** `frontend/components/komunitas/PostCard.tsx`
- **Verification:** `grep -c "dangerouslySetInnerHTML" frontend/components/komunitas/PostCard.tsx` now returns `0`.
- **Committed in:** `883d7cf` (Task 2) — fixed before commit, not a separate follow-up.

---

**Total deviations:** 2 (1 backend join fix for a real missing-functionality gap, 1 cosmetic comment wording fix)
**Impact on plan:** Task 2's PostCard now genuinely shows real author names end-to-end rather than a permanent placeholder; no scope creep beyond what was needed to satisfy the plan's own explicit requirement.

## Issues Encountered

- The backend container's `CMD ["node", "--import", "tsx", "src/server.ts"]` has no file-watcher despite the volume-mounted `src/` directory — repository/service edits required a manual `docker compose restart backend` to take effect (unlike a nodemon-based dev setup). Restarted once and confirmed clean startup logs with zero errors.
- 11 pre-existing/unrelated backend test failures remain (activity.service.test.ts x2, fluidLog `_createEntryCore`, labResult trend queries x3, `dispatchDueReminders` x4) — same set documented in 06-01/06-02/06-04's summaries, none introduced or worsened by this plan.
- No interactive-browser tool is available in this execution environment to visually screenshot `/edukasi/komunitas`. Verification was instead performed via: (1) `next build` succeeding with zero errors and the route statically generated, (2) `npx tsc --noEmit` clean across the whole frontend, (3) HTTP 200 with no server error logs post-rebuild, and (4) real login + `POST`/`GET`/`PATCH .../archive` calls against the live backend confirming the full create → appear-in-feed → filter-narrows → archive-hides lifecycle works end-to-end with real data (not mocked). A human should still do a final pixel-level visual pass (375px/1024px breakpoints) per the plan's `<human-check>` verification line.

## Known Stubs

- `PostCard.tsx`'s `replyCount`/`helpfulTotal` render with a defensive `0` fallback — the current `GET /api/community` feed response does not include per-post reply/helpful aggregates. This is explicitly permitted by the plan's own Task 2 action text ("If the backend feed response does not yet include replyCount/helpfulTotal, render them defensively") and is intended to be resolved by 06-07 (post detail + reply UI), which already has the backend aggregate logic (`communityReply.repository.ts`'s live `COUNT(*)`-based `helpfulCount`) to draw from.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 06-07 (post detail, reply list, "Tandai Membantu" toggle, archive-own-post UI) can now build `PostDetail.tsx`/`ReplyList.tsx`/`ReplyItem.tsx` and mount them at `/edukasi/komunitas/[id]`, which `PostCard` already links to.
- 06-07 should consider surfacing real `replyCount`/`helpfulTotal` back into the feed (e.g. via a lightweight aggregate in `findFeed`) if a future iteration wants those counts visible without opening the detail view — not required for this plan's scope.
- No blockers.

---
*Phase: 06-community-education*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 6 created/modified files and all 3 task commit hashes (`6b7fbc0`, `883d7cf`, `7f822a8`) verified present on disk / in git history.
