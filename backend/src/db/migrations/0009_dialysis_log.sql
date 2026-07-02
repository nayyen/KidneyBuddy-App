-- Migration: dialysis_log table for Cuci Darah (HD/CAPD session) compliance
-- Mirrors medication_log structure for dialysis session confirmation tracking

CREATE TABLE IF NOT EXISTS "dialysis_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "reminder_id" uuid NOT NULL REFERENCES "reminder_schedule"("id") ON DELETE CASCADE,
  "jenis" text NOT NULL,
  "nama" text NOT NULL,
  "konsentrasi_capd" text,
  "status" text NOT NULL,
  "waktu_pengingat" timestamp NOT NULL,
  "waktu_konfirmasi" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_dialysis_log_user_waktu"
  ON "dialysis_log" ("user_id", "waktu_pengingat");
