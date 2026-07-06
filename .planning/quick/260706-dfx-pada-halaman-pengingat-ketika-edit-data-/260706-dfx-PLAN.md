---
task: 260706-dfx
type: quick
autonomous: false
files_modified:
  - frontend/components/pengingat/EditReminderSheet.tsx
  - frontend/components/pengingat/AddReminderSheet.tsx
must_haves:
  truths:
    - "Selecting an image in the native file picker keeps the /pengingat edit form open"
    - "A live preview of the newly chosen image shows in the still-open form"
    - "Submitting persists the new image so it displays everywhere the reminder photo appears"
  artifacts:
    - path: "frontend/components/pengingat/EditReminderSheet.tsx"
      provides: "Radix Sheet dismissal guard that survives file-picker focus return"
    - path: "frontend/components/pengingat/AddReminderSheet.tsx"
      provides: "Same dismissal guard for the add-reminder sheet"
  key_links:
    - from: "file input click inside SheetContent"
      to: "onPointerDownOutside / onFocusOutside / onInteractOutside guards"
      via: "shared filePickerOpenRef flag"
---

<objective>
On `/pengingat`, editing a medication reminder and choosing a photo in the native OS
file picker causes the Radix Sheet (edit form) to close instantly, every time — losing
the in-progress edit before the user can submit.

Purpose: Reminder reliability is the product's core value; users must be able to
attach/replace a medication photo without the form vanishing.

Output: A robust dismissal guard on both the edit and add reminder Sheets so the form
stays open through the file-picker round trip, shows the new preview, and submits the
new image.
</objective>

<root_cause>
Confirmed by reading the current code (do not re-litigate — implement the fix):

- `frontend/components/ui/sheet.tsx` wraps Radix `Dialog` (`radix-ui` package). Its
  `SheetContent` spreads `{...props}` straight onto `SheetPrimitive.Content`, so
  dismissal-event props and DOM handlers (e.g. `onClickCapture`) attach to the real
  content element.
- The prior fix (quick-260706-arp) added `onPointerDownOutside` and `onInteractOutside`
  handlers to `EditReminderSheet` / `AddReminderSheet` that call `e.preventDefault()`
  ONLY when `e.target.tagName === "INPUT" && type === "file"`.
- That guard fails: when the native file picker closes and focus returns to the browser,
  Radix's DismissableLayer dismisses on a **focus** event whose target is
  `document.body` (or another element), NOT the file input — so the tagName check is
  false and `preventDefault()` is never called. There is also **no `onFocusOutside`
  guard at all**. Result: `onOpenChange(false)` fires → Sheet closes every time.
- The persistence path is already correct and must NOT be changed: on submit,
  `MedicationReminderForm.onSubmit` PATCHes `foto_obat` (multipart) →
  `EditReminderSheet.handleSuccess` → `ReminderItem.handleEditSuccess` → `onEdited` →
  `ReminderList.fetchReminders` (a genuine server refetch, from quick-260706-8zc). Once
  the form stays open long enough to submit, the new photo already propagates everywhere.

So the fix is purely: make the Sheet ignore dismissal caused by the file-picker focus
round trip, without breaking normal backdrop / Esc close.
</root_cause>

<context>
@.planning/STATE.md
@frontend/components/pengingat/EditReminderSheet.tsx
@frontend/components/pengingat/AddReminderSheet.tsx
@frontend/components/pengingat/MedicationReminderForm.tsx
@frontend/components/ui/sheet.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace fragile tagName guard with a file-picker focus-round-trip guard on both reminder Sheets</name>
  <files>frontend/components/pengingat/EditReminderSheet.tsx, frontend/components/pengingat/AddReminderSheet.tsx</files>
  <action>
    In BOTH EditReminderSheet.tsx and AddReminderSheet.tsx, make the `SheetContent`
    dismissal survive the native file-picker focus round trip using a ref flag instead
    of the current event-target `tagName` check.

    1. Add `import { useRef, useEffect } from "react";` (merge with existing React
       imports — AddReminderSheet already has React state; keep it clean).

    2. Inside the component, create `const filePickerOpenRef = useRef(false);`.

    3. On `SheetContent`, add `onClickCapture` that sets the flag when a file input is
       clicked (the input's click event fires synchronously BEFORE the OS picker opens,
       so the flag is set in time). Use `closest('input[type="file"]')` on the event
       target — not an exact `tagName` match — so it still catches clicks that land on
       a wrapper:
         if the clicked target (an HTMLElement) `.closest('input[type="file"]')` is
         non-null, set `filePickerOpenRef.current = true`.

    4. Guard ALL THREE dismissal events on `SheetContent` — `onPointerDownOutside`,
       `onFocusOutside`, and `onInteractOutside` — so that when `filePickerOpenRef.current`
       is true, call `e.preventDefault()` (block the dismiss). Adding `onFocusOutside`
       is the load-bearing change: the focus-return dismiss currently has no guard.
       Keep the guard limited to the flag so a normal backdrop click / Esc (flag false)
       still closes the sheet as before.

    5. Reset the flag so it cannot permanently wedge the backdrop-close:
       - Clear `filePickerOpenRef.current = false` inside the `onFocusOutside` handler
         AFTER calling `preventDefault()` (covers both file-chosen and picker-cancelled
         cases, since focus returns either way).
       - Add a backstop: a `useEffect` that registers a `window` `focus` listener which,
         on refocus, schedules `filePickerOpenRef.current = false` via
         `setTimeout(..., 0)` (runs AFTER Radix's synchronous focusOutside handler so the
         guard still sees `true` on the same tick, then clears it). Clean up the listener
         on unmount.

    6. DELETE the old `tagName === "INPUT"` conditional bodies — replace them with the
       flag check described above. Do not leave both mechanisms fighting.

    Do NOT touch MedicationReminderForm.tsx, the submit/PATCH path, ReminderItem's
    `onEdited` wiring, or ReminderList's refetch — persistence already works. This task
    only changes the two Sheet wrappers' dismissal handling.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit</automated>
  </verify>
  <done>
    Both EditReminderSheet.tsx and AddReminderSheet.tsx compile clean; each `SheetContent`
    has `onClickCapture` setting `filePickerOpenRef`, plus `onPointerDownOutside`,
    `onFocusOutside`, and `onInteractOutside` handlers that `preventDefault()` while the
    flag is set; the old exact-`tagName` guard is gone; a window-focus effect resets the
    flag.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Dismissal guard on the /pengingat edit (and add) reminder Sheets so choosing a photo
    in the native OS file picker no longer closes the form. Submit + display-everywhere
    path was already correct and unchanged.
  </what-built>
  <how-to-verify>
    1. Run the app (frontend + backend) and open `/pengingat`.
    2. On a medication (obat) reminder card, click the pencil (Edit) icon — the edit
       Sheet opens.
    3. In "Foto Obat", click the file input and pick an image in the OS file explorer.
       EXPECT: the edit form STAYS OPEN and shows the newly chosen file name / preview
       (it must NOT close/disappear). Try this 2-3 times to confirm it is reliable.
    4. If the reminder already had a photo, click "Hapus Foto" first, then pick a new
       image — form still stays open.
    5. Click "Simpan Pengingat". EXPECT: success toast, Sheet closes normally.
    6. Confirm the new photo now shows on the reminder card / detail overlay on
       `/pengingat` (and anywhere else the reminder photo appears, e.g. `/beranda`).
    7. Sanity: reopen the edit Sheet and click the dark backdrop (outside the form) —
       it should still close normally (guard must not break normal dismissal).
    8. Repeat step 2-3 via the "Tambah Pengingat" (add) sheet to confirm the add form
       behaves the same.
  </how-to-verify>
  <resume-signal>Type "approved" or describe what still misbehaves</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` clean in `frontend/`.
- Human confirms: file selection keeps the edit form open with a live preview, submit
  persists the new photo everywhere, and normal backdrop/Esc close still works.
</verification>

<success_criteria>
- Selecting an image on the /pengingat edit form no longer closes the form (every time).
- New image preview visible in the still-open form; submit persists it and it shows on
  all reminder photo display sites.
- Add-reminder sheet behaves identically; backdrop/Esc dismissal unaffected.
</success_criteria>

<output>
Create `.planning/quick/260706-dfx-pada-halaman-pengingat-ketika-edit-data-/260706-dfx-SUMMARY.md` when done.
</output>
