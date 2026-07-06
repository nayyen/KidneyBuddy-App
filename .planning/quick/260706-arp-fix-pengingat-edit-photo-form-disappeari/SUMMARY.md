---
status: complete
quick_id: 260706-arp
slug: fix-pengingat-edit-photo-form-disappeari
date: 2026-07-06
---

# Quick Task 260706-arp — Summary

## Task 1: Fix pengingat edit photo form disappearing on file select

**Root cause:** The `EditReminderSheet` (and `AddReminderSheet`) use Radix UI's `Sheet` (Dialog primitive). When a file `<input type="file">` inside the sheet is clicked and the native file picker opens, Radix's `onPointerDownOutside` / `onInteractOutside` handler fires (the native file dialog opening registers as an outside interaction), causing the sheet to close and the user's in-progress edit to be lost.

**Fix:** Added `onPointerDownOutside` and `onInteractOutside` event handlers to `SheetContent` in both `EditReminderSheet.tsx` and `AddReminderSheet.tsx`. These handlers call `e.preventDefault()` when the event target is an `<input type="file">`, preventing the sheet from closing during file selection.

**Files changed:**
- `frontend/components/pengingat/EditReminderSheet.tsx`
- `frontend/components/pengingat/AddReminderSheet.tsx`

## Task 2: Remove nomorTelepon and tanggalLahir from registration

Removed phone number (`nomorTelepon`) and birth date (`tanggalLahir`) from the registration form, backend validation, DB schema, seed data, and test files. Dropped the DB columns via migration.

**Files changed:**

Frontend:
- `frontend/lib/validators/auth.schema.ts` — removed from `registerSchema`
- `frontend/app/(auth)/register/page.tsx` — removed two form field blocks
- `frontend/lib/hooks/useAuth.ts` — removed from `User` interface

Backend:
- `backend/src/db/schema/users.schema.ts` — removed column definitions
- `backend/src/services/auth.service.ts` — removed from `registerSchema` + `insertUser` call
- `backend/src/seed/seed-demo.ts` — removed from seed insert

Test files:
- `backend/src/test/debug_err.ts`, `debug_obat2.ts`, `debug_trace.ts`, `profile.e2e.ts`, `verify_single_use.ts` — removed from registration payloads

Database migration:
- `backend/src/db/migrations/0014_drop_user_phone_birthdate.sql` (new) — `ALTER TABLE users DROP COLUMN IF EXISTS nomor_telepon, tanggal_lahir` (idempotent)
- `backend/src/db/migrations/meta/_journal.json` — added idx 14 entry
- `backend/src/db/migrations/meta/0014_snapshot.json` (new) — copy of 0013 minus the two columns

## Verification

- Frontend `tsc --noEmit`: clean (exit 0)
- Backend `tsc --noEmit`: no errors related to changed files (pre-existing debug-file errors only)
- Backend full test suite: 254/254 pass (72 suites, 0 failures)
- Backend container: started successfully, migrations complete, listening on port 4000
- Registration API test: POST `/api/auth/register` without `nomorTelepon`/`tanggalLahir` succeeds; response does not include those fields
- DB verification: `users` table has 13 columns (down from 15), `nomor_telepon` and `tanggal_lahir` confirmed dropped

## Pending

- Human browser verification of the edit-photo form fix (selecting a file in the edit sheet should no longer close the form)
- Human browser verification of the registration page (form should no longer show Nomor Telepon and Tanggal Lahir fields)
