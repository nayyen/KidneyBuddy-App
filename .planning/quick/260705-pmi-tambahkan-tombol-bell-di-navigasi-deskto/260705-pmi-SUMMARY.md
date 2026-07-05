---
phase: quick-260705-pmi
plan: 01
subsystem: ui
tags: [nextjs, react, shell-components, accessibility]

requires: []
provides:
  - "Bottom nav inactive icon/label color darkened from #cfe8e4 to #3d6b66, matching desktop Sidebar.tsx's inactive icon color for legibility against a white background"
  - "Confirmation (via code read) that the desktop notification bell already exists in TopBar.tsx, wired to /notifikasi with an unread badge"
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - "frontend/components/shell/BottomNav.tsx"

key-decisions:
  - "Used #3d6b66 for both the bottom-nav inactive icon AND label (not #1a2e2c, which the desktop sidebar uses for its inactive label) to keep the icon+label pair visually unified at 10px font size, per plan rationale."
  - "No code change made for the desktop notification bell — TopBar.tsx already contains a Bell button wired to onNotificationClick -> router.push('/notifikasi') with the amber unread-count badge via useUnreadAnomalyCount, identical in behavior to the mobile MobileHeader.tsx bell. Adding a second bell would have been redundant."

patterns-established: []

requirements-completed: [quick-260705-pmi]

duration: ~5min
completed: 2026-07-05
---

# Quick Task 260705-pmi: Darken bottom-nav inactive color + verify desktop bell Summary

**Bottom-nav unselected icon/label color changed from near-invisible #cfe8e4 to #3d6b66 (matches desktop sidebar); desktop notification bell confirmed already present and correctly wired in TopBar.tsx — no code change needed for that half.**

## Performance

- **Duration:** ~5 min
- **Tasks:** 1 of 2 (Task 1 auto-executed; Task 2 is a checkpoint:human-verify, intentionally not executed by this run)
- **Files modified:** 1

## Accomplishments

- `BottomNav.tsx` unselected icon `color` prop and label `style.color` both changed from `#cfe8e4` to `#3d6b66`, matching `Sidebar.tsx`'s inactive icon color. Active state (`#2a9d8f`) and the active-indicator dot are untouched.
- Verified by code read (not just assumed) that `TopBar.tsx` (desktop-only header, `hidden lg:flex`, rendered by `AppShell.tsx`) already renders a `Bell` button whose `onClick` calls `onNotificationClick` (wired in `AppShell.tsx` to navigate to `/notifikasi`), and shows an amber unread-count dot via `useUnreadAnomalyCount(accessToken)` — the same mechanism used by the mobile `MobileHeader.tsx` bell. This confirms the plan's hypothesis that the "missing desktop bell" report did not match the current code; **no frontend change was required for this half of the task.**

## Task Commits

Each task was committed atomically:

1. **Task 1: Darken bottom-nav inactive icon and label color to match desktop sidebar** - `150efc7` (fix)

**Plan metadata:** (pending — orchestrator commits SUMMARY.md/STATE.md separately per execution protocol)

## Files Created/Modified

- `frontend/components/shell/BottomNav.tsx` - Inactive nav icon `color` prop and label `style.color` changed from `#cfe8e4` to `#3d6b66`.

## Decisions Made

- Matched both icon and label inactive colors to `#3d6b66` (the sidebar's inactive *icon* color) rather than splitting icon/label between `#3d6b66` and `#1a2e2c` as the desktop sidebar does, per the plan's explicit rationale for visual unity at small font sizes.
- Confirmed via code inspection (no speculative fix) that `TopBar.tsx`'s existing `Bell` button already satisfies the "add desktop bell" request — avoided introducing a redundant second bell.

## Deviations from Plan

None - plan executed exactly as written for Task 1. Task 2 (`checkpoint:human-verify`) was intentionally not executed — it requires a real browser and a human, per this run's constraints.

## Issues Encountered

None.

## Pending Human Verification

**Task 2 of the plan (`checkpoint:human-verify`, gate="blocking") is still pending.** It requires a human to:

1. Run the frontend dev server and open the app in a browser.
2. At desktop width (>= 1024px), confirm the `TopBar.tsx` bell is visible, navigates to `/notifikasi` on click, and shows the amber unread dot if there are unread anomaly alerts.
3. At non-desktop width (< 1024px), confirm the bottom-nav's unselected icons/labels are now clearly visible (muted teal-gray `#3d6b66`) against white, noticeably darker than before, and that the selected item still shows `#2a9d8f` with its active dot.

This SUMMARY does not close out that verification — it must be confirmed manually in a browser before the quick task can be considered fully done.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Code change for bottom-nav legibility is complete and committed (`150efc7`).
- Desktop bell requires no further code work per this analysis.
- Awaiting human browser verification of both items (Task 2 checkpoint) before final close-out.

---
*Phase: quick-260705-pmi*
*Completed: 2026-07-05*

## Self-Check: PASSED
- FOUND: frontend/components/shell/BottomNav.tsx
- FOUND: commit 150efc7
