# Quick Task 260706-arp: Fix Pengingat Edit Photo Form + Remove Registration Phone/Birthdate

**Created:** 2026-07-06
**Status:** Ready for execution

## Description

Two user-reported issues:
1. On `/pengingat`, when editing a reminder to add a photo, selecting a file causes the edit form (Sheet) to disappear — user can't add the photo or submit.
2. On the registration page, phone number (`nomorTelepon`) and birth date (`tanggalLahir`) are no longer needed — remove them from the registration form and the DB table columns.

## Root Cause Analysis

### Task 1: Edit form disappears on file select

The `EditReminderSheet` uses Radix UI's `Sheet` (Dialog primitive). When a file `<input type="file">` inside the sheet is clicked and the native file picker opens, Radix's `onPointerDownOutside` / `onInteractOutside` handler fires (the native file dialog opening registers as an outside interaction), causing the sheet to close unexpectedly.

**Fix:** Add `onPointerDownOutside` and `onInteractOutside` handlers to `SheetContent` in both `EditReminderSheet.tsx` and `AddReminderSheet.tsx` that call `e.preventDefault()` when the interaction target is a file input, preventing the sheet from closing during file selection.

### Task 2: Remove nomorTelepon and tanggalLahir

**Frontend changes:**
- `frontend/lib/validators/auth.schema.ts` — remove `nomorTelepon` and `tanggalLahir` from `registerSchema`
- `frontend/app/(auth)/register/page.tsx` — remove the two form field blocks
- `frontend/lib/hooks/useAuth.ts` — remove from `User` interface

**Backend changes:**
- `backend/src/db/schema/users.schema.ts` — remove column definitions
- `backend/src/services/auth.service.ts` — remove from `registerSchema` and `insertUser` call
- `backend/src/seed/seed-demo.ts` — remove from seed insert
- `backend/src/test/debug_err.ts`, `debug_obat2.ts`, `debug_trace.ts`, `profile.e2e.ts`, `verify_single_use.ts` — remove from registration payloads

**Database migration:**
- Create `0014_drop_user_phone_birthdate.sql` — `ALTER TABLE users DROP COLUMN nomor_telepon, DROP COLUMN tanggal_lahir;`
- Update `_journal.json` with idx 14 entry
- Create `0014_snapshot.json` (copy of 0013 minus the two columns)
- Apply migration to running Docker DB

## Tasks

### T1: Fix Sheet close-on-file-select (EditReminderSheet + AddReminderSheet)
- Files: `frontend/components/pengingat/EditReminderSheet.tsx`, `frontend/components/pengingat/AddReminderSheet.tsx`
- Add `onPointerDownOutside` + `onInteractOutside` handlers that prevent closing when target is a file input

### T2: Remove nomorTelepon and tanggalLahir — Frontend
- Files: `frontend/lib/validators/auth.schema.ts`, `frontend/app/(auth)/register/page.tsx`, `frontend/lib/hooks/useAuth.ts`

### T3: Remove nomorTelepon and tanggalLahir — Backend schema + service + seed
- Files: `backend/src/db/schema/users.schema.ts`, `backend/src/services/auth.service.ts`, `backend/src/seed/seed-demo.ts`

### T4: Remove nomorTelepon and tanggalLahir — Test files
- Files: `backend/src/test/debug_err.ts`, `debug_obat2.ts`, `debug_trace.ts`, `profile.e2e.ts`, `verify_single_use.ts`

### T5: Database migration
- Create `0014_drop_user_phone_birthdate.sql`
- Update `_journal.json` + `0014_snapshot.json`
- Apply to Docker DB

### T6: Build + verify
- `tsc` clean on frontend + backend
- Apply migration to Docker DB
- Verify registration works without the two fields
