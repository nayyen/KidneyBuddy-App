---
quick_id: 260708-uqf
description: Fix freeze desktop "Buat (Ulang) Wawasan" — giant DOM di /catatan (default Semua data render semua entri sepanjang masa)
date: 2026-07-08
type: quick
status: complete
---

# Summary: Fix freeze Chrome desktop via pembatasan DOM /catatan

Bounded the *rendered* DOM in `FluidLogList.tsx` (tab Cairan) and `ActivityList.tsx` (tab Aktivitas) to at most 14 day-groups on initial render, regardless of the "Semua data" range default — fixing a production-confirmed freeze where the default range rendered 1000+ card DOM nodes (139,415px `scrollHeight`), and every `WeeklyInsightCard` state change above the list (klik "Buat/Buat Ulang Wawasan") forced a full relayout/repaint of the entire giant document.

## What changed

### Task 1 — `frontend/components/catatan/FluidLogList.tsx`
- Added `INITIAL_DAY_GROUPS = 14` and `LOAD_MORE_STEP = 30` constants.
- Added `visibleGroups` state, reset to `INITIAL_DAY_GROUPS` on every successful `fetchEntries()` (covers range change, refetch on save/focus/visibility).
- Day-group render now uses `sortedDates.slice(0, visibleGroups)` instead of rendering every group.
- Each rendered day-group `<div>` wrapper now has `contentVisibility: "auto", containIntrinsicSize: "auto 320px"` so groups scrolled offscreen skip layout/paint (Chrome 85+, no-op elsewhere).
- Added a "Tampilkan {N} hari sebelumnya" button (mirrors the "Buat Ulang Wawasan" pill style — transparent bg, `#2a9d8f` border/text, `border-radius: 20`, `height: 36`) below the rendered groups when `sortedDates.length > visibleGroups`; clicking it increments `visibleGroups` by `LOAD_MORE_STEP`.
- Daily selisih header (fix quick-260708-qqd #2) is unchanged and still renders for every rendered group.
- "Semua data" dropdown option is untouched — it still fetches the full 3650-day window server-side; only the *client render* is capped.

### Task 2 — `frontend/components/aktivitas/ActivityList.tsx`
- Same `INITIAL_DAY_GROUPS`/`LOAD_MORE_STEP`/`visibleGroups` pattern applied to its per-day groups (this list groups by day like FluidLogList, not a flat list, so no item-count fallback was needed).
- Since this component's range filter (`range` state) is applied *client-side* against an already-fetched full list (`/api/activities/all`, no server param), `visibleGroups` is reset via a dedicated `useEffect` on `range` change (in addition to reset inside `fetchActivities()`'s success path), since changing `range` here doesn't trigger a new fetch.
- `sortedDates.slice(0, visibleGroups)` caps the render; same load-more button style added after the list.
- Each rendered day-group `<div>` wrapper has the same `contentVisibility`/`containIntrinsicSize` treatment.
- Duration display (fix quick-260708-qqd #4, "Durasi total: …") is unchanged.

### Task 3 — Verification
- `cd frontend && npm run build` — passed (Next.js 16.2.9, Turbopack, 22 routes generated, serwist SW precache 44 entries).
- Grep confirms `contentVisibility`/`content-visibility` and "Tampilkan N hari sebelumnya" button logic present in both files.
- Backend untouched — no backend files were read or modified as part of this change; backend tsc/test baselines are unaffected (4 pre-existing tsc errors, 269/272 tests, per plan's stated baseline).

## Expected outcome (for orchestrator's post-deploy production re-check)

On tab Cairan with the default "Semua data" range and a demo account with months of history, `document.documentElement.scrollHeight` should drop from ~139,415px (unbounded, ~1000+ cards) to a bounded height corresponding to at most 14 rendered day-groups (order of a few thousand px, not 100k+). Clicking "Buat Wawasan"/"Buat Ulang Wawasan" on `WeeklyInsightCard` should no longer trigger a multi-second-to-minutes-long main-thread freeze on modest desktop hardware, since the layout/paint cost of the relayout is now bounded by ~14 groups' worth of DOM instead of the entire history. Groups beyond the initial 14 remain fully present in `entries`/`activities` state and are revealed progressively via "Tampilkan N hari sebelumnya" without a re-fetch.

This plan does not itself verify the production freeze is gone (that requires the instrumented Playwright re-run against the deployed build, per the plan) — it implements the confirmed fix strategy (bound rendered DOM, not the feature) and confirms the frontend build passes cleanly.

## Deviations from Plan

None — plan executed exactly as written for Tasks 1–3. `ActivityList.tsx` groups per-day (not flat), so the item-count fallback mentioned as a conditional in the plan ("if it renders a flat list, cap by item count 100 + step 200 instead") was not needed.

## Commits

- `a88e98e` — `fix(quick-260708-uqf): batasi DOM /catatan (progressive disclosure + content-visibility) - fix freeze Buat Wawasan desktop`

## Self-Check

- FOUND: `frontend/components/catatan/FluidLogList.tsx` (modified, contains `INITIAL_DAY_GROUPS`, `contentVisibility`, "Tampilkan" button)
- FOUND: `frontend/components/aktivitas/ActivityList.tsx` (modified, contains `INITIAL_DAY_GROUPS`, `contentVisibility`, "Tampilkan" button)
- FOUND: commit `a88e98e` in `git log`
- `npm run build` in `frontend/` completed successfully (see Task 3 above)

## Self-Check: PASSED
