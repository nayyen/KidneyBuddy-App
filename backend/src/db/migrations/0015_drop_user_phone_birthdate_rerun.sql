-- 0014 shipped as an empty file, so databases migrated before the fix (local
-- Docker was altered manually; fresh deploys recorded 0014 as applied with no
-- effect) still have these NOT NULL columns. Re-run the drops idempotently.
ALTER TABLE "users" DROP COLUMN IF EXISTS "nomor_telepon";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "tanggal_lahir";
