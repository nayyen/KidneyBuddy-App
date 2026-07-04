---
phase: 06-community-education
plan: 03
subsystem: ui
tags: [nextjs, react, education, edukasi]

# Dependency graph
requires:
  - phase: 06-community-education (plan 02)
    provides: GET /api/education (metodeTerapi/tipeKonten filterable) + GET /api/education/:id, live and seeded with 10 Bahasa Indonesia articles
provides:
  - "/edukasi real education content browser (list, therapy filter, detail dialog), replacing the Phase 5 'Konten Segera Hadir' placeholder"
  - "EdukasiSubNav shared two-pill Edukasi/Komunitas sub-nav, route-driven via usePathname"
  - "/edukasi/komunitas new placeholder route ready for 06-06's CommunityFeed"
affects: [06-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EdukasiSubNav uses next/link + usePathname (route-driven active state) instead of local useState tabs, per D-03's separate-routes decision — distinct from catatan/page.tsx's single-route local-state pill pattern"
    - "GET /api/education's list response already includes each row's full isi body (no isi-omitting projection in educationContent.repository.ts), so EducationDetail reuses the already-fetched list item directly with no follow-up GET /api/education/:id round-trip"

key-files:
  created:
    - frontend/components/edukasi/EdukasiSubNav.tsx
    - frontend/components/edukasi/EducationList.tsx
    - frontend/components/edukasi/EducationCard.tsx
    - frontend/components/edukasi/EducationDetail.tsx
    - frontend/app/(app)/edukasi/komunitas/page.tsx
  modified:
    - frontend/app/(app)/edukasi/page.tsx

key-decisions:
  - "EducationDetail receives the already-fetched EducationList item directly (no accessToken prop, no GET /api/education/:id call) since the list endpoint's Drizzle findAll() selects the full row including isi — the plan's alternative (follow-up detail fetch) was unnecessary given the actual backend shape."
  - "Doc-comment wording in EducationCard.tsx/EducationDetail.tsx avoids the literal substring 'dangerouslySetInnerHTML' (paraphrased as 'raw-HTML injection API') so the plan's own grep -c ... dangerouslySetInnerHTML acceptance checks return 0 as intended, rather than matching an explanatory comment."

requirements-completed: [EDU-01]

# Metrics
duration: ~35min
completed: 2026-07-04
---

# Phase 06: Community & Education — Plan 03 (Education Frontend) Summary

**Real, filterable education content browser at /edukasi (list + server-side therapy-method filter + safe plain-text article detail dialog) replacing the Phase 5 placeholder, plus the two-pill Edukasi/Komunitas sub-nav and a new /edukasi/komunitas placeholder route — EDU-01 is now demoable end-to-end against the live 06-02 backend.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-04 (session start)
- **Completed:** 2026-07-04
- **Tasks:** 3
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments
- `/edukasi` now renders `EdukasiSubNav` (Edukasi pill active by default per D-04), keeps `LifestyleSuggestionCard` exactly where it was, and mounts `EducationList` in place of the old "Konten Segera Hadir" `BookOpen` placeholder.
- `EducationList` fetches `GET /api/education` and refetches server-side (query param, not client `.filter()`) whenever the Semua/CAPD/HD/Transplantasi/Umum pill-chip filter changes; renders loading ("Memuat..."), error ("Gagal memuat konten..." + "Coba Lagi" retry), and empty ("Konten Tidak Ditemukan" / "Coba pilih kategori atau metode terapi lain.") states.
- `EducationCard` renders judul/ringkasan/therapy-tag badge (CAPD teal, HD amber, Transplantasi purple, Umum neutral, per UI-SPEC) and a tipeKonten icon (BookOpen/Dumbbell/Salad for artikel/panduan_senam/gaya_hidup).
- `EducationDetail` opens the selected article inside `ui/dialog` with Display 18/700 title, therapy badge, optional static `<img>` illustration (no video/iframe, D-11), and the full body rendered as a plain JSX text child with `whitespace-pre-wrap` — no `dangerouslySetInnerHTML` anywhere in the new components.
- New `/edukasi/komunitas` route reuses the exact auth-guard boilerplate, renders `EdukasiSubNav` (Komunitas pill active), and shows a placeholder body ready for 06-06's `CommunityFeed`.
- Verified end-to-end against the live stack: rebuilt and restarted the `kidneybuddy-frontend` production container (its Dockerfile bakes a production `next build`, no src volume mount, unlike the backend), confirmed `next build` statically generated both `/edukasi` and `/edukasi/komunitas` routes with zero build errors, confirmed both routes return HTTP 200 with no server errors in container logs, and confirmed via a real login (`lukman@kidneybuddy.demo`) + `GET /api/education?metodeTerapi=CAPD` call from inside the backend container that the therapy filter genuinely narrows results (3 CAPD-only rows returned, matching the seeded 06-02 data).

## Task Commits

1. **Task 1: Sub-nav pills + updated /edukasi page + /edukasi/komunitas placeholder route** - `a43f527` (feat)
2. **Task 2: EducationList (fetch + therapy filter) and EducationCard** - `456bbd9` (feat)
3. **Task 3: EducationDetail article view** - `4b557b9` (feat)

## Files Created/Modified
- `frontend/components/edukasi/EdukasiSubNav.tsx` - two-pill Edukasi/Komunitas sub-nav, `next/link` + `usePathname()`, pill styling copied verbatim from `catatan/page.tsx` (12px/700, 36px height, 20px radius, active `#2a9d8f`/inactive `#f0faf9`)
- `frontend/app/(app)/edukasi/page.tsx` - keeps `LifestyleSuggestionCard`, mounts `EdukasiSubNav` + `EducationList`, removes the "Konten Segera Hadir" placeholder
- `frontend/app/(app)/edukasi/komunitas/page.tsx` - new auth-guarded placeholder route for 06-06
- `frontend/components/edukasi/EducationList.tsx` - fetch + server-side therapy filter + loading/error/empty states + card list + selected-article dialog state
- `frontend/components/edukasi/EducationCard.tsx` - card UI (title, ringkasan line-clamp-2, therapy badge, tipeKonten icon), exports the shared `EducationItem` type
- `frontend/components/edukasi/EducationDetail.tsx` - Dialog-based article detail, safe `whitespace-pre-wrap` plain-text body, optional static illustration

## Decisions Made
See `key-decisions` in frontmatter. Most notable: `EducationDetail` does not perform a follow-up `GET /api/education/:id` call — the list endpoint's repository (`educationContent.repository.ts`'s `findAll()`) already selects every column including `isi`, so the already-fetched list item is passed straight through, simplifying the component and avoiding an unnecessary network round-trip the plan flagged as conditionally needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reworded doc comments to avoid tripping the plan's own `dangerouslySetInnerHTML` grep checks**
- **Found during:** Task 3 acceptance-criteria verification (`grep -c "dangerouslySetInnerHTML" ...`)
- **Issue:** Explanatory doc comments in `EducationCard.tsx` and `EducationDetail.tsx` stated "never uses dangerouslySetInnerHTML" as a design note. Since the plan's acceptance criteria run a literal `grep -c "dangerouslySetInnerHTML"` and expect `0`, the comment's mere mention of the string (even in a sentence forbidding its use) caused the check to return `1`.
- **Fix:** Reworded both comments to describe the same guarantee without using the literal API name ("no raw-HTML injection API is used").
- **Files modified:** `frontend/components/edukasi/EducationCard.tsx`, `frontend/components/edukasi/EducationDetail.tsx`
- **Verification:** `grep -c "dangerouslySetInnerHTML" frontend/components/edukasi/EducationList.tsx frontend/components/edukasi/EducationCard.tsx` → both `0`; `grep -c "dangerouslySetInnerHTML" frontend/components/edukasi/EducationDetail.tsx` → `0`
- **Committed in:** `456bbd9` (Task 2), `4b557b9` (Task 3) — fixed before each task's commit, not a separate follow-up commit

---

**Total deviations:** 1 auto-fixed (cosmetic doc-comment wording, no functional change)
**Impact on plan:** No scope creep — purely a comment rewording to satisfy the plan's own literal grep-based acceptance criteria without weakening the documentation's intent.

## Issues Encountered
- The frontend container (unlike the backend's volume-mounted `src/`) bakes a production `next build` into its Docker image with no host mount, so host-side file edits do not appear in the running container until the image is rebuilt. Resolved by running `docker compose build frontend && docker compose up -d frontend` before verification — confirmed by `next build`'s route-generation log listing both `/edukasi` and `/edukasi/komunitas`.
- No interactive-browser tool is available in this execution environment to visually screenshot the pages. Verification was instead performed via: (1) `next build` succeeding with zero errors and both routes statically generated, (2) `npx tsc --noEmit` clean, (3) HTTP 200 responses with no server error logs for both `/edukasi` and `/edukasi/komunitas` post-rebuild, and (4) a real login + `GET /api/education?metodeTerapi=CAPD` call against the live backend confirming the therapy filter narrows results to exactly the 3 seeded CAPD rows. This substantiates the feature is wired correctly end-to-end, though a human should still do a final pixel-level visual pass (375px/1024px breakpoints) as called out in the plan's `<human-check>` verification line.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 06-06 (community feed) can now build `CommunityFeed`/`PostDetail`/etc. and drop them into the already-standing `/edukasi/komunitas` route, replacing its placeholder body — `EdukasiSubNav` already renders correctly on that route with the Komunitas pill active.
- No blockers.

---
*Phase: 06-community-education*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 6 created/modified files and all 3 task commit hashes (`a43f527`, `456bbd9`, `4b557b9`) verified present on disk / in git history.
