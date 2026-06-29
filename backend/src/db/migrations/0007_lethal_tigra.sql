CREATE TABLE IF NOT EXISTS "lab_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tanggal_pemeriksaan" date NOT NULL,
	"kategori" text,
	"nama_parameter" text NOT NULL,
	"nilai" text NOT NULL,
	"satuan" text,
	"nilai_rujukan" text,
	"catatan" text,
	"sumber" text DEFAULT 'manual' NOT NULL,
	"file_id" uuid,
	"diarsipkan" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
DO $$ BEGIN
 ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lab_user_date" ON "lab_results" USING btree ("user_id","tanggal_pemeriksaan");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lab_user_param" ON "lab_results" USING btree ("user_id","nama_parameter","diarsipkan");