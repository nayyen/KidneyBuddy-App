CREATE TABLE IF NOT EXISTS "daily_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nama_kegiatan" text NOT NULL,
	"waktu_mulai" timestamp DEFAULT now() NOT NULL,
	"estimasi_selesai" timestamp NOT NULL,
	"status" text DEFAULT 'berlangsung' NOT NULL,
	"waktu_selesai" timestamp,
	"perasaan" text,
	"catatan_perasaan" text,
	"reminder_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
DO $$ BEGIN
 ALTER TABLE "daily_activities" ADD CONSTRAINT "daily_activities_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_daily_activities_user_status" ON "daily_activities" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_daily_activities_estimasi_end" ON "daily_activities" USING btree ("estimasi_selesai","status","reminder_sent");