---
phase: quick-260705-psi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/repositories/dailyActivity.repository.ts
  - backend/src/test/activity.service.test.ts
  - frontend/components/aktivitas/ActivityList.tsx
  - frontend/components/lab/LabResultList.tsx
  - frontend/components/lab/LabArchivedList.tsx
autonomous: true
requirements: [QUICK-260705-PSI]
must_haves:
  truths:
    - "Clicking the trash icon on an activity in /catatan shows a confirm dialog before anything is deleted"
    - "After confirming delete, the activity is gone AND stays gone after a page reload (does not reappear as 'belum selesai')"
    - "Deleting or editing an activity on /catatan immediately refreshes the beranda Kegiatan card and the /catatan list without a manual reload"
    - "Archiving or restoring a lab item immediately refreshes the /catatan lab views without a manual reload"
    - "Every other destructive action already audited (cairan delete, pengingat delete) still has its confirm + refresh working"
  artifacts:
    - path: "frontend/components/aktivitas/ActivityList.tsx"
      provides: "Activity delete confirm dialog + ACTIVITY_SAVED sync dispatch on delete/edit"
    - path: "backend/src/repositories/dailyActivity.repository.ts"
      provides: "Activity list queries that exclude soft-deleted ('dibatalkan') rows"
  key_links:
    - from: "ActivityList.handleDelete"
      to: "window ACTIVITY_SAVED listener (beranda + catatan)"
      via: "dispatchSyncEvent(SYNC_EVENTS.ACTIVITY_SAVED)"
    - from: "findAllByUser"
      to: "GET /api/activities/all response"
      via: "status != 'dibatalkan' filter"
---

<objective>
Audit every destructive (delete) and immediate-execute action across the app's data-entry surfaces, guarantee a confirm step exists before each one, and guarantee that after any delete/edit all related views refresh to reflect true DB state (no stale optimistic UI, no reappearing "deleted" rows).

Purpose: The aktivitas delete currently (a) deletes on a single click with no confirmation (data-loss risk) and (b) reappears after reload as "belum selesai" because the backend soft-delete is never filtered out of the list query. Both violate the project's core value of reliable, trustworthy daily tracking.

Output: Confirm dialog on aktivitas delete (reusing the existing AlertDialog pattern), a backend fix so soft-deleted activities never reappear, consistent ACTIVITY_SAVED / LAB_SAVED sync dispatches so all views refresh, and a documented audit table of every delete/edit action in the SUMMARY.
</objective>

<audit_findings>
Investigation completed during planning. Current state of every destructive / immediate-execute action:

| Entity | Action | Component | Confirm before execute? | Refreshes other views? | Persists correctly? |
|--------|--------|-----------|--------------------------|------------------------|---------------------|
| Aktivitas | DELETE | `ActivityList.tsx` `handleDelete` | ❌ NONE — deletes on single click | ❌ optimistic setState only, no `ACTIVITY_SAVED` | ❌ soft-delete `status='dibatalkan'` NOT filtered by `findAllByUser` → reappears as "belum selesai" on reload |
| Aktivitas | EDIT (inline) | `ActivityList.tsx` `handleEditSave` | ✓ inline form with explicit "Simpan" (review step) | ❌ no `ACTIVITY_SAVED` dispatch | ✓ (PUT persists) |
| Cairan | DELETE | `FluidLogItem.tsx` `handleDelete` | ✓ confirm overlay | ✓ dispatches `FLUID_SAVED` | ✓ |
| Cairan | EDIT | `FluidEditSheet.tsx` | ✓ form submit | ✓ `FLUID_SAVED` | ✓ |
| Obat | confirm/unconfirm | `MedicationLogItem.tsx` | N/A — reversible toggle | ✓ (via parent) | ✓ |
| Cuci Darah | confirm/unconfirm | `DialysisLogItem.tsx` | N/A — reversible toggle | ✓ (via parent) | ✓ |
| Lab | Archive | `LabResultList.tsx` `handleArchive` | N/A — reversible (restore exists) | ❌ optimistic filter only, no `LAB_SAVED` | ✓ (PATCH persists) |
| Lab | Restore | `LabArchivedList.tsx` `handleRestore` | N/A — reversible | ❌ no `LAB_SAVED` dispatch | ✓ |
| Pengingat | DELETE | `ReminderItem.tsx` + `DeleteReminderConfirm.tsx` | ✓ shared AlertDialog confirm | ✓ dispatches `REMINDER_UPDATED` | ✓ |

**Conclusion — items needing a fix:**
1. Aktivitas DELETE: add confirm dialog + persistence filter + `ACTIVITY_SAVED` dispatch (Tasks 1 + 2).
2. Aktivitas EDIT: add `ACTIVITY_SAVED` dispatch for refresh consistency (Task 2).
3. Lab Archive/Restore: add `LAB_SAVED` dispatch for refresh consistency (Task 3). Confirm dialog NOT required — archive is reversible via restore (not data loss), so it stays a one-tap action per the task's "focus on immediate irreversible actions" guidance.

**Items confirmed already-correct (no change):** cairan delete/edit, pengingat delete, obat/cuci-darah toggles. The shared confirm pattern is `AlertDialog` (see `DeleteReminderConfirm.tsx`) — reuse it, do not invent a new one.
</audit_findings>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@frontend/lib/syncEvents.ts
@frontend/components/pengingat/DeleteReminderConfirm.tsx
@frontend/components/aktivitas/ActivityList.tsx
@backend/src/repositories/dailyActivity.repository.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Stop soft-deleted activities from reappearing (backend persistence fix)</name>
  <files>backend/src/repositories/dailyActivity.repository.ts, backend/src/test/activity.service.test.ts</files>
  <action>
Root cause of the "deleted activity reappears as belum selesai after reload" bug: `deleteById` soft-deletes by setting `status = 'dibatalkan'`, but the list queries never exclude that status.

Fix `findAllByUser` (feeds `GET /api/activities/all`, the ActivityList source): add a predicate excluding cancelled rows so it returns only non-`dibatalkan` activities. Use Drizzle's `ne(dailyActivities.status, "dibatalkan")` combined with the existing `eq(dailyActivities.userId, userId)` via `and(...)`. Import `ne` from `drizzle-orm` if not already imported.

Apply the SAME exclusion to the by-date list query (the `findByUserAndDate` / date-scoped select near the top of the file, used by `GET /api/activities?date=`) so the by-date `/catatan` and beranda views are consistent — a cancelled activity must never surface in any user-facing list. Do NOT touch `findDueForEndReminder` (already filters `status = 'berlangsung'`) or `findActive`.

Keep the soft-delete approach (do not switch to hard DELETE) — status history is intentional. This is purely a read-filter fix.

In `activity.service.test.ts`, add/extend a test asserting that after `deleteActivity`, the id no longer appears in the `listAllActivities` result. Follow the existing test fixture/mock style in that file.
  </action>
  <verify>
    <automated>cd backend && npm test -- activity.service 2>&1 | tail -20</automated>
  </verify>
  <done>Activity list queries (`findAllByUser` and the by-date query) exclude `status='dibatalkan'`; new/updated test confirms a deleted activity is absent from the list result; existing activity tests still pass.</done>
</task>

<task type="auto">
  <name>Task 2: Add confirm dialog + sync refresh to aktivitas delete/edit</name>
  <files>frontend/components/aktivitas/ActivityList.tsx</files>
  <action>
Two changes in `ActivityList.tsx`, reusing existing patterns (do NOT invent new UI).

(A) Confirm-before-delete: today `handleDelete` runs immediately from the trash button's `onClick`. Add an AlertDialog confirm following the exact pattern of `frontend/components/pengingat/DeleteReminderConfirm.tsx` (same `@/components/ui/alert-dialog` primitive, same styling: title 14px `#1a2e2c`, body 12px `#3d6b66`, "Batal" cancel, destructive "Hapus" action `#d4183d`, `isDeleting` disabled state). Wire it with local state: add `const [deleteTarget, setDeleteTarget] = useState<ActivityResult | null>(null)` (and a `isDeleting` boolean). The trash button's `onClick` sets `deleteTarget` (opens dialog) instead of calling `handleDelete` directly. The dialog's confirm calls `handleDelete(deleteTarget.id)` then clears the target. Dialog copy: title "Hapus Aktivitas?", body referencing `deleteTarget.namaKegiatan` — e.g. "Aktivitas '{nama}' akan dihapus permanen. Tindakan ini tidak dapat dibatalkan." Render one AlertDialog instance at the component root (not one per row) driven by `deleteTarget`.

(B) Sync refresh: import `SYNC_EVENTS, dispatchSyncEvent` from `@/lib/syncEvents`. In `handleDelete`, after the successful DELETE and toast, call `dispatchSyncEvent(SYNC_EVENTS.ACTIVITY_SAVED)` (keep the optimistic `setActivities` filter for snappy UX — the dispatch drives beranda + the catatan-page refreshKey which triggers a real refetch reflecting true DB state). In `handleEditSave`, after the successful PUT and toast, also call `dispatchSyncEvent(SYNC_EVENTS.ACTIVITY_SAVED)` so an edited finish-time/estimasi is reflected on beranda and re-fetched here. Confirm listeners already exist: `frontend/app/(app)/catatan/page.tsx` and `frontend/app/(app)/beranda/page.tsx` both listen for `activity:saved` and bump their refreshKey — no page changes needed.

Do NOT add a confirm step to the inline edit flow — it already has an explicit "Simpan" review action, which satisfies the audit requirement.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | grep -i "ActivityList" || echo "no ActivityList type errors"</automated>
  </verify>
  <done>Trash icon opens an AlertDialog confirm (Batal/Hapus) before any delete; confirming deletes and dispatches ACTIVITY_SAVED; editing dispatches ACTIVITY_SAVED; frontend typechecks clean.</done>
</task>

<task type="auto">
  <name>Task 3: Lab archive/restore refresh consistency + audit closeout</name>
  <files>frontend/components/lab/LabResultList.tsx, frontend/components/lab/LabArchivedList.tsx</files>
  <action>
Refresh consistency only (archive/restore are reversible, so no confirm dialog is required per the audit).

In `LabResultList.tsx` `handleArchive`: import `SYNC_EVENTS, dispatchSyncEvent` from `@/lib/syncEvents` and, after the successful PATCH `/api/lab/:id/archive` and the "Item diarsipkan" toast, call `dispatchSyncEvent(SYNC_EVENTS.LAB_SAVED)`. Keep the optimistic `setResults` filter.

In `LabArchivedList.tsx` `handleRestore`: same import, and after the successful restore + "Item dipulihkan" toast, call `dispatchSyncEvent(SYNC_EVENTS.LAB_SAVED)` so the active lab list re-populates the restored item without a manual reload.

The `catatan/page.tsx` already listens for `lab:saved` and bumps `labRefreshKey` — no page change needed.

Do NOT change cairan, obat, cuci-darah, or pengingat components — the planning audit confirmed they already have correct confirm + refresh behavior. This task also serves as the audit closeout: record the full audit findings table (from this plan's `<audit_findings>`) in the SUMMARY so the "every delete/edit action" deliverable is documented.
  </action>
  <verify>
    <automated>cd frontend && grep -c "dispatchSyncEvent(SYNC_EVENTS.LAB_SAVED)" components/lab/LabResultList.tsx components/lab/LabArchivedList.tsx</automated>
  </verify>
  <done>Lab archive and restore both dispatch LAB_SAVED; active/archived lab views refresh without manual reload; SUMMARY documents the complete delete/edit audit table.</done>
</task>

</tasks>

<verification>
- Manual smoke (frontend running): on /catatan aktivitas tab, click trash → confirm dialog appears; cancel keeps the item; confirm removes it; reload page → item does NOT reappear.
- Edit an active activity's estimasi/finish → beranda Kegiatan card reflects it without manual reload.
- Archive a lab item → it leaves the active list and the view stays consistent after reload; restore from arsip → reappears in active list without manual reload.
- `cd backend && npm test -- activity.service` passes.
- `cd frontend && npx tsc --noEmit` clean.
</verification>

<success_criteria>
- No delete action anywhere in the app executes on a single click without either a confirm dialog (delete) or an explicit submit/review step (edit).
- Soft-deleted activities never reappear in any list after reload.
- Delete/edit on aktivitas and archive/restore on lab refresh all related views immediately via the syncEvents system, reflecting true DB state.
- The full delete/edit audit table is documented in the SUMMARY, including items confirmed already-correct.
</success_criteria>

<output>
Create `.planning/quick/260705-psi-audit-semua-aksi-hapus-edit-data-di-app-/260705-psi-SUMMARY.md` when done, including the full audit findings table.
</output>
