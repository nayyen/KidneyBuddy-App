---
phase: quick-260706-ea3
plan: 01
subsystem: ui
tags: [react, next.js, pengingat, reminders, hooks]

requires:
  - phase: quick-260706-8zc
    provides: "handleEdited forced-refetch fix on post-edit save (must remain untouched)"
provides:
  - "ReminderList skeleton renders only on true initial load"
  - "Background refetches update reminders in place without unmounting ReminderItem/EditReminderSheet"
  - "Failed background refetch no longer clears an already-rendered list or forces the full-page error branch"
affects: [pengingat, reminders]

tech-stack:
  added: []
  patterns:
    - "hasLoadedOnceRef + remindersRef pattern: distinguish true-initial-load (show skeleton, allow error branch) from background refetch (silent update, never unmount subtree) in a useCallback with a narrow dep array"

key-files:
  created: []
  modified:
    - frontend/components/pengingat/ReminderList.tsx

key-decisions:
  - "Gated the background-refetch error suppression on remindersRef.current.length === 0 (a ref mirroring `reminders` state) rather than solely on hasLoadedOnceRef, so a retry-after-initial-failure (Coba Lagi button) still surfaces errors correctly, and a background failure that happens while a list is genuinely empty still gets reported."

requirements-completed: [QUICK-260706-ea3]

duration: ~10min
completed: 2026-07-06
---

# Quick Task 260706-ea3: Root-cause fix — pengingat edit form disappearing on background refetch Summary

**Root-caused and fixed `ReminderList.tsx` calling `setIsLoading(true)` on every refetch (including background ones triggered by window focus / visibilitychange / 30s poll / SYNC_EVENTS), which unmounted every `ReminderItem` and silently destroyed an open `EditReminderSheet`'s local state.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 1 of 2 completed (Task 2 is a `checkpoint:human-verify` gate, left open per plan)
- **Files modified:** 1

## Accomplishments

- Added `hasLoadedOnceRef` (React `useRef`) so `setIsLoading(true)` only fires on the true initial fetch — background refetches never re-enter the skeleton branch.
- Added `remindersRef` (mirrors `reminders` state via a small `useEffect`) so the memoized `fetchReminders` callback (deps: `[accessToken]` only) can synchronously check "is any data currently displayed?" without needing `reminders` in its dependency array (which would have caused it to be redefined every render, defeating some of the stability the fix relies on).
- A failed background refetch no longer clears the already-rendered `reminders` list, and no longer forces the full-page error branch — that branch is now reserved for the case where there is no data currently displayed (`remindersRef.current.length === 0`).
- `handleEdited`'s existing forced refetch (from quick-260706-8zc, which refreshes the photo in place post-edit) is untouched in behavior — it now runs as a background refetch (ref already `true` by the time an edit save happens), which is exactly the desired "refresh silently, no skeleton flash" outcome.

## Task Commits

1. **Task 1: Make skeleton render only on initial load; background refetches update in place** - `a0bb409` (fix)

Task 2 (`checkpoint:human-verify`, gate="blocking") was NOT executed — it requires a human driving a real browser, native OS file picker, and waiting through real timers (30s idle poll, tab switch). Per plan constraints this SUMMARY stops here and returns control for that verification.

## Files Created/Modified

- `frontend/components/pengingat/ReminderList.tsx` — Added `hasLoadedOnceRef` + `remindersRef`; `fetchReminders` now only calls `setIsLoading(true)` before the first-ever successful/failed fetch resolves; background refetches call `setReminders` in place without touching `isLoading`; a failed background refetch (list already populated) neither clears `reminders` nor sets `error`. `handleDeleted`, `handleUpdated`, `handleEdited`, the sort logic, the empty-state `return null`, and all JSX list rendering are unchanged, per plan constraints.

## Decisions Made

- Chose `remindersRef.current.length === 0` (mirrored via a ref rather than reading `reminders` directly inside the memoized callback) over gating purely on `hasLoadedOnceRef` for the error-suppression condition — the plan called this out as a "pick the sensible option" choice. This choice preserves the pre-existing "Coba Lagi" retry-after-failure UX exactly (retry still surfaces a new error if it also fails, since the list is still empty at that point) while also correctly reporting a background failure in the rare case a background refetch races before any data has ever loaded.

## Deviations from Plan

None — Task 1 executed exactly as specified in the plan's `<action>` block. The "concrete shape" suggested in the plan (using only `hasLoadedOnceRef`) was extended with a second ref (`remindersRef`) purely to implement the plan's own suggested alternative gating condition (`reminders.length === 0`) without introducing a stale-closure bug, since `fetchReminders` is a `useCallback` with `[accessToken]` as its only dependency and cannot safely read the `reminders` state value directly.

## Issues Encountered

None. `npx tsc --noEmit` passed clean on the first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness — Pending Human Verification (Task 2)

Task 2 of the plan is a `checkpoint:human-verify` gate (`gate="blocking"`) and has NOT been executed. It requires a human to drive a real browser, the native OS file picker, and wait through real timers — this cannot be automated or faked.

**To verify, run the frontend dev server (`cd frontend && npm run dev`), open `/pengingat` with at least one existing "obat" (medication) reminder, and perform:**

1. **File-picker repro (the reported bug):**
   - Tap the pencil (edit) icon on a medication reminder — the Edit sheet opens.
   - In the edit form, tap the photo/foto obat picker to open the native OS file dialog and select an image.
   - EXPECTED: the Edit sheet stays open with your selected photo showing. It must NOT disappear/close when the file dialog closes.

2. **Background-sync repro (confirms the fix stops teardown generally, not just for the file-picker case):**
   - With the list idle (no sheet open), switch to another browser tab/app and switch back to the `/pengingat` tab.
   - EXPECTED: the list does NOT flash a loading skeleton or visibly reset — it stays rendered smoothly.
   - Also wait ~30s (the cross-device poll interval) while idle on the page.
   - EXPECTED: no skeleton flash / list reset occurs while idle.

3. **Regression sanity:**
   - Reload the page fresh (Cmd/Ctrl+R). EXPECTED: the skeleton DOES appear briefly on this true initial load, then the list renders (initial-load skeleton still works).
   - Complete an actual edit (change the dosis or photo, save). EXPECTED: sheet closes, list reflects the change (photo updates), no error.

**Resume signal:** Type "approved" if the edit sheet survives the file picker AND no skeleton flash occurs on tab-switch/30s idle AND initial-load skeleton + edit-save still work. Otherwise describe what happened so the fix can be revisited.

---
*Quick task: 260706-ea3*
*Task 1 completed: 2026-07-06 — Task 2 (human verification) pending*

## Self-Check: PASSED

- FOUND: frontend/components/pengingat/ReminderList.tsx
- FOUND: .planning/quick/260706-ea3-root-cause-fix-pengingat-edit-reminder-f/260706-ea3-SUMMARY.md
- FOUND: commit a0bb409
