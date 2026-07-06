---
task: 260706-dfx
type: quick
subsystem: ui
tags: [radix-ui, dialog, sheet, file-input, react]

key-files:
  modified:
    - frontend/components/pengingat/EditReminderSheet.tsx
    - frontend/components/pengingat/AddReminderSheet.tsx

key-decisions:
  - "Replaced the exact-tagName dismissal-event-target check (from quick-260706-arp) with a filePickerOpenRef flag set on onClickCapture, since the focus-return dismissal event's target is document.body/another element, never the file input itself."
  - "Guarded onFocusOutside in addition to the pre-existing onPointerDownOutside/onInteractOutside — onFocusOutside was completely unguarded before this fix, which is the actual root cause of the sheet closing every time."
  - "Added a window 'focus' listener backstop (setTimeout 0) to clear the flag after the round trip, so normal backdrop/Esc dismissal is not permanently blocked."

completed: 2026-07-06
---

# Quick Task 260706-dfx Summary

**Replaced the fragile exact-tagName file-picker dismissal guard on both reminder Sheets with a click-capture ref flag that also guards `onFocusOutside` — the actual root cause of the edit form closing on every photo selection.**

## Status

- **Task 1 (auto): DONE.** Implemented and committed.
- **Task 2 (checkpoint:human-verify, gate="blocking"): PENDING.** Requires a human driving a real browser + OS native file picker; cannot be completed autonomously. See "How to verify" below — these are the exact steps from the plan.

## Root Cause (confirmed, not re-litigated)

The prior fix (quick-260706-arp) added `onPointerDownOutside`/`onInteractOutside` handlers that called `e.preventDefault()` only when the event target's `tagName === "INPUT"` and `type === "file"`. That guard never actually fired for the real failure mode: when the native OS file picker closes and focus returns to the browser, Radix's `DismissableLayer` dismisses on a **focus** event whose target is `document.body` (or another element) — not the file input — so the tagName check was always false. There was also **no `onFocusOutside` handler at all** before this fix. Result: the Sheet closed on essentially every file-picker round trip.

## Fix (Task 1)

In both `EditReminderSheet.tsx` and `AddReminderSheet.tsx`:

1. Added `useRef`/`useEffect` imports and a `filePickerOpenRef = useRef(false)`.
2. Added `onClickCapture` on `SheetContent` that sets `filePickerOpenRef.current = true` when the clicked target's `.closest('input[type="file"]')` is non-null (fires synchronously before the OS picker opens).
3. Guarded all three Radix dismissal events — `onPointerDownOutside`, `onFocusOutside` (new), `onInteractOutside` — to call `e.preventDefault()` while the flag is set. `onFocusOutside` also clears the flag immediately after preventing, since focus returning is itself the signal the round trip completed.
4. Added a `window` `focus` event listener (cleaned up on unmount) that clears the flag via `setTimeout(..., 0)` as a backstop, so the flag can never permanently wedge normal backdrop/Esc dismissal.
5. Deleted the old exact-`tagName` conditional bodies entirely — only the new flag-based guard remains.

Persistence path (`MedicationReminderForm.onSubmit` → PATCH `foto_obat` multipart → `EditReminderSheet.handleSuccess` → `ReminderItem.handleEditSuccess` → `onEdited` → `ReminderList.fetchReminders` refetch, from quick-260706-8zc) was **not touched** — it was already correct; this task only fixes the Sheet closing before submit could happen.

## Task Commits

1. **Task 1: Replace fragile tagName guard with file-picker focus-round-trip guard** - `2f211a1` (fix)

## Verification

- `cd frontend && npx tsc --noEmit` — clean, no errors.

## Deviations from Plan

None - plan executed exactly as written.

## Task 2: Pending Human Verification (checkpoint:human-verify, gate="blocking")

This step requires a human driving a real browser and the OS's native file picker — it cannot be automated or faked. Exact steps from the plan:

1. Run the app (frontend + backend) and open `/pengingat`.
2. On a medication (obat) reminder card, click the pencil (Edit) icon — the edit Sheet opens.
3. In "Foto Obat", click the file input and pick an image in the OS file explorer.
   **EXPECT:** the edit form STAYS OPEN and shows the newly chosen file name/preview (must NOT close/disappear). Try 2-3 times to confirm reliability.
4. If the reminder already had a photo, click "Hapus Foto" first, then pick a new image — form should still stay open.
5. Click "Simpan Pengingat". **EXPECT:** success toast, Sheet closes normally.
6. Confirm the new photo now shows on the reminder card / detail overlay on `/pengingat` (and anywhere else the reminder photo appears, e.g. `/beranda`).
7. Sanity check: reopen the edit Sheet and click the dark backdrop (outside the form) — it should still close normally (guard must not break normal dismissal).
8. Repeat steps 2-3 via the "Tambah Pengingat" (add) sheet to confirm the add form behaves the same.

**Resume signal:** Type "approved" or describe what still misbehaves.

## Next Steps

Awaiting human browser verification of Task 2 before this quick task can be marked fully complete.
