---
phase: quick-260705-psi
plan: 01
subsystem: ui
tags: [nextjs, express, drizzle-orm, aktivitas, lab, sync-events, alert-dialog]

requires: []
provides:
  - "Activity list queries (findAllByUser, findByDate) exclude soft-deleted (status='dibatalkan') rows — deleted activities never reappear as 'belum selesai' after reload"
  - "Aktivitas delete now requires an AlertDialog confirm (Batal/Hapus) before executing, reusing the DeleteReminderConfirm.tsx pattern"
  - "Aktivitas delete + edit and lab archive + restore all dispatch their canonical SYNC_EVENTS so beranda + /catatan refresh immediately without a manual reload"
  - "Documented full delete/edit audit table across all 9 destructive/immediate-execute actions in the app"
affects: [aktivitas, lab, beranda, catatan]

tech-stack:
  added: []
  patterns:
    - "Root-level single AlertDialog instance driven by a `deleteTarget` state object (not one dialog per row) — same pattern as the pengingat module's DeleteReminderConfirm.tsx"
    - "Injectable core test seam (_deleteActivityCore/_listAllActivitiesCore) added retroactively to activities.service.ts so a list-filter regression can be asserted without a live DB, matching the existing _createActivityCore/_completeActivityCore convention"

key-files:
  created: []
  modified:
    - "backend/src/repositories/dailyActivity.repository.ts"
    - "backend/src/services/activities.service.ts"
    - "backend/src/test/activity.service.test.ts"
    - "frontend/components/aktivitas/ActivityList.tsx"
    - "frontend/components/lab/LabResultList.tsx"
    - "frontend/components/lab/LabArchivedList.tsx"

key-decisions:
  - "Added _deleteActivityCore/_listAllActivitiesCore injectable wrappers to activities.service.ts (not in the original file list) — required as a test seam so the delete-persistence regression could be verified without a live Postgres connection, following the file's existing DI convention exactly."
  - "Lab archive/restore did NOT get a confirm dialog — archiving is reversible via restore, so per the plan's audit conclusion it remains a one-tap action; only the missing LAB_SAVED sync dispatch was added."
  - "Cairan delete/edit, pengingat delete, and obat/cuci-darah confirm toggles were confirmed already-correct during planning and were NOT touched in this execution."

patterns-established:
  - "Any future destructive (delete) action added to the app must reuse the AlertDialog confirm pattern (title 14px #1a2e2c / body 12px #3d6b66 / Batal cancel / destructive #d4183d Hapus action) and must dispatch the relevant SYNC_EVENTS entry on success."

requirements-completed: [QUICK-260705-PSI]

duration: ~20min
completed: 2026-07-05
---

# Quick Task 260705-psi: Audit semua aksi hapus/edit data di app Summary

**Fixed the aktivitas delete data-loss bug (no confirm dialog + soft-deleted rows reappearing after reload) and closed the cross-view refresh gap for aktivitas edit and lab archive/restore, completing a full audit of every destructive/immediate-execute action in the app.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3 of 3
- **Files modified:** 6

## Accomplishments

- **Backend persistence fix:** `findAllByUser` and `findByDate` in `dailyActivity.repository.ts` now exclude `status='dibatalkan'` rows via `ne(dailyActivities.status, "dibatalkan")`, so a soft-deleted activity never resurfaces as "belum selesai" on `/catatan` or beranda after a page reload.
- **Confirm-before-delete on aktivitas:** `ActivityList.tsx`'s trash icon now opens a single root-level `AlertDialog` (title "Hapus Aktivitas?", body referencing the activity name, "Batal"/"Hapus" actions) instead of deleting on a single click — visually and structurally matching `DeleteReminderConfirm.tsx`.
- **Cross-view sync consistency:** aktivitas delete and edit, plus lab archive and restore, all now call `dispatchSyncEvent(SYNC_EVENTS.ACTIVITY_SAVED / LAB_SAVED)` after a successful mutation, so beranda's Kegiatan card and `/catatan`'s activity/lab lists refetch and reflect true DB state without a manual reload. The listeners for these events already existed in `catatan/page.tsx` and `beranda/page.tsx` — no page-level changes were needed.
- **Full audit closeout:** the complete 9-row delete/edit audit table (from planning) is preserved below, documenting every entity's confirm-before-execute and refresh-on-mutation status, including the 6 actions confirmed already-correct that received no changes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Stop soft-deleted activities from reappearing (backend persistence fix)** - `752dfbd` (fix)
2. **Task 2: Add confirm dialog + sync refresh to aktivitas delete/edit** - `626dbac` (feat)
3. **Task 3: Lab archive/restore refresh consistency + audit closeout** - `b36415f` (feat)

**Plan metadata:** (pending — orchestrator commits SUMMARY.md/STATE.md separately per execution protocol)

## Files Created/Modified

- `backend/src/repositories/dailyActivity.repository.ts` - `findAllByUser` and `findByDate` now filter out `status='dibatalkan'` rows via `and(..., ne(status, "dibatalkan"))`.
- `backend/src/services/activities.service.ts` - Added `_deleteActivityCore` and `_listAllActivitiesCore` injectable test-seam wrappers around `deleteActivity`/`listAllActivities`, mirroring the existing `_createActivityCore`/`_completeActivityCore` DI pattern.
- `backend/src/test/activity.service.test.ts` - New `describe("activity delete persistence (quick-260705-psi)")` block: in-memory `deleteById` (soft-delete to `dibatalkan`) + `findAllByUser` (excludes `dibatalkan`) fixtures, asserting a deleted activity's id is absent from the list result and a kept activity's id is still present.
- `frontend/components/aktivitas/ActivityList.tsx` - Added `deleteTarget`/`isDeleting` state, a root-level `AlertDialog` confirm wired to the trash button, and `dispatchSyncEvent(SYNC_EVENTS.ACTIVITY_SAVED)` calls in both `handleDelete` and `handleEditSave`.
- `frontend/components/lab/LabResultList.tsx` - `handleArchive` now dispatches `SYNC_EVENTS.LAB_SAVED` after the successful PATCH + toast.
- `frontend/components/lab/LabArchivedList.tsx` - `handleRestore` now dispatches `SYNC_EVENTS.LAB_SAVED` after the successful restore + toast.

## Decisions Made

- Added the `_deleteActivityCore`/`_listAllActivitiesCore` test seams to `activities.service.ts` even though the plan's `files_modified` list only named the repository and the test file — this was necessary to make the persistence-filter regression testable without a live DB, and follows the file's own pre-existing DI convention exactly (Rule 3 — blocking issue, test infrastructure gap).
- Left lab archive/restore as one-tap actions (no confirm dialog) — confirmed reversible via the existing restore flow, matching the plan's audit conclusion that confirm dialogs are only required for genuinely irreversible deletes.
- Made no changes to cairan, pengingat, or obat/cuci-darah components — all were confirmed already-correct during planning (see audit table below).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added injectable test seams to activities.service.ts**
- **Found during:** Task 1
- **Issue:** `deleteActivity` and `listAllActivities` called the repository module directly with no dependency-injection seam, so the plan's required regression test ("after `deleteActivity`, the id no longer appears in the `listAllActivities` result") could not be written without a live Postgres connection, unlike every other test in the file.
- **Fix:** Added `_deleteActivityCore(userId, id, deleteFn)` and `_listAllActivitiesCore(userId, listFn)` following the exact signature/DI style of the file's existing `_createActivityCore`/`_completeActivityCore`; the production `deleteActivity`/`listAllActivities` functions now just bind the real repository functions into these cores.
- **Files modified:** `backend/src/services/activities.service.ts`
- **Verification:** `node --import tsx --test src/test/activity.service.test.ts` — 9/9 pass, including the new regression test.
- **Committed in:** `752dfbd` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking/testability)
**Impact on plan:** Necessary to satisfy the plan's own test requirement; no scope creep — no behavior change to production `deleteActivity`/`listAllActivities` call signatures from the caller's perspective (controller code unchanged).

## Full Delete/Edit Audit Table

| Entity | Action | Component | Confirm before execute? | Refreshes other views? | Persists correctly? |
|--------|--------|-----------|--------------------------|------------------------|---------------------|
| Aktivitas | DELETE | `ActivityList.tsx` `handleDelete` | ✓ **FIXED** — AlertDialog confirm (Batal/Hapus) | ✓ **FIXED** — dispatches `ACTIVITY_SAVED` | ✓ **FIXED** — `findAllByUser`/`findByDate` now exclude `dibatalkan` |
| Aktivitas | EDIT (inline) | `ActivityList.tsx` `handleEditSave` | ✓ inline form with explicit "Simpan" (unchanged) | ✓ **FIXED** — dispatches `ACTIVITY_SAVED` | ✓ (PUT persists, unchanged) |
| Cairan | DELETE | `FluidLogItem.tsx` `handleDelete` | ✓ confirm overlay (already correct, no change) | ✓ dispatches `FLUID_SAVED` (no change) | ✓ (no change) |
| Cairan | EDIT | `FluidEditSheet.tsx` | ✓ form submit (no change) | ✓ `FLUID_SAVED` (no change) | ✓ (no change) |
| Obat | confirm/unconfirm | `MedicationLogItem.tsx` | N/A — reversible toggle (no change) | ✓ via parent (no change) | ✓ (no change) |
| Cuci Darah | confirm/unconfirm | `DialysisLogItem.tsx` | N/A — reversible toggle (no change) | ✓ via parent (no change) | ✓ (no change) |
| Lab | Archive | `LabResultList.tsx` `handleArchive` | N/A — reversible via restore (no confirm required, no change) | ✓ **FIXED** — dispatches `LAB_SAVED` | ✓ (PATCH persists, unchanged) |
| Lab | Restore | `LabArchivedList.tsx` `handleRestore` | N/A — reversible (no change) | ✓ **FIXED** — dispatches `LAB_SAVED` | ✓ (no change) |
| Pengingat | DELETE | `ReminderItem.tsx` + `DeleteReminderConfirm.tsx` | ✓ shared AlertDialog confirm (already correct, no change) | ✓ dispatches `REMINDER_UPDATED` (no change) | ✓ (no change) |

## Issues Encountered

None beyond the testability gap documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 3 tasks complete and committed (`752dfbd`, `626dbac`, `b36415f`).
- `cd backend && node --import tsx --test src/test/activity.service.test.ts` passes 9/9.
- `cd frontend && npx tsc --noEmit` is clean (no errors in any modified file).
- Manual smoke verification (trash icon confirm dialog, reload persistence, beranda/catatan live refresh, lab archive/restore refresh) is recommended before considering this task's UX fully verified in a live browser, but all code-level acceptance criteria from the plan are satisfied.

---
*Phase: quick-260705-psi*
*Completed: 2026-07-05*

## Self-Check: PASSED
- FOUND: backend/src/repositories/dailyActivity.repository.ts
- FOUND: backend/src/services/activities.service.ts
- FOUND: backend/src/test/activity.service.test.ts
- FOUND: frontend/components/aktivitas/ActivityList.tsx
- FOUND: frontend/components/lab/LabResultList.tsx
- FOUND: frontend/components/lab/LabArchivedList.tsx
- FOUND: commit 752dfbd
- FOUND: commit 626dbac
- FOUND: commit b36415f
