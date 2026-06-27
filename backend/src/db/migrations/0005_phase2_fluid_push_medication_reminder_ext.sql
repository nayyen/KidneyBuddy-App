CREATE TABLE "fluid_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tanggal" text NOT NULL,
	"waktu" text NOT NULL,
	"tipe" text NOT NULL,
	"sumber" text,
	"konsentrasi_capd" text,
	"volume" numeric(8, 2) NOT NULL,
	"satuan" text DEFAULT 'ml' NOT NULL,
	"kondisi_keluar" text,
	"catatan" text,
	"is_late_entry" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reminder_id" uuid NOT NULL,
	"nama_obat" text NOT NULL,
	"dosis" text,
	"jenis_obat" text,
	"status" text NOT NULL,
	"waktu_pengingat" timestamp NOT NULL,
	"waktu_konfirmasi" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"subscription_object" jsonb NOT NULL,
	"device_label" text,
	"aktif" boolean DEFAULT true NOT NULL,
	"last_confirmed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "reminder_schedule" ADD COLUMN "dosis" text;--> statement-breakpoint
ALTER TABLE "reminder_schedule" ADD COLUMN "jenis_obat" text;--> statement-breakpoint
ALTER TABLE "reminder_schedule" ADD COLUMN "foto_obat" text;--> statement-breakpoint
ALTER TABLE "reminder_schedule" ADD COLUMN "konsentrasi_capd" text;--> statement-breakpoint
ALTER TABLE "reminder_schedule" ADD COLUMN "follow_up_sent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reminder_schedule" ADD COLUMN "last_notification_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "fluid_log" ADD CONSTRAINT "fluid_log_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_log" ADD CONSTRAINT "medication_log_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_log" ADD CONSTRAINT "medication_log_reminder_id_reminder_schedule_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminder_schedule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fluid_log_user_date" ON "fluid_log" USING btree ("user_id","tanggal");--> statement-breakpoint
CREATE INDEX "idx_medication_log_user_waktu" ON "medication_log" USING btree ("user_id","waktu_pengingat");