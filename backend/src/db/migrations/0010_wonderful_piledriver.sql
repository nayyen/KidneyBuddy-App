CREATE TABLE "ai_daily_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tanggal" text NOT NULL,
	"ringkasan_text" text NOT NULL,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_ai_daily_summary_user_date" UNIQUE("user_id","tanggal")
);
--> statement-breakpoint
CREATE TABLE "ai_lab_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lab_result_id" uuid NOT NULL,
	"analisis_text" text NOT NULL,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_ai_lab_analysis_lab_result" UNIQUE("lab_result_id")
);
--> statement-breakpoint
CREATE TABLE "ai_lifestyle_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tanggal" text NOT NULL,
	"saran_text" text NOT NULL,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_ai_lifestyle_suggestion_user_date" UNIQUE("user_id","tanggal")
);
--> statement-breakpoint
CREATE TABLE "ai_weekly_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pekan" text NOT NULL,
	"wawasan_text" text NOT NULL,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_ai_weekly_insight_user_pekan" UNIQUE("user_id","pekan")
);
--> statement-breakpoint
CREATE TABLE "anomaly_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tipe_anomali" text NOT NULL,
	"severity" text NOT NULL,
	"confidence_score" integer NOT NULL,
	"deskripsi" text NOT NULL,
	"status" text DEFAULT 'aktif' NOT NULL,
	"feedback_pengguna" text,
	"tipe_pasien" text NOT NULL,
	"rule_data" jsonb DEFAULT '{}'::jsonb,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_daily_summaries" ADD CONSTRAINT "ai_daily_summaries_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_lab_analyses" ADD CONSTRAINT "ai_lab_analyses_lab_result_id_lab_results_id_fk" FOREIGN KEY ("lab_result_id") REFERENCES "public"."lab_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_lifestyle_suggestions" ADD CONSTRAINT "ai_lifestyle_suggestions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_weekly_insights" ADD CONSTRAINT "ai_weekly_insights_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomaly_alerts" ADD CONSTRAINT "anomaly_alerts_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_anomaly_user_created" ON "anomaly_alerts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_anomaly_user_type_status" ON "anomaly_alerts" USING btree ("user_id","tipe_anomali","status");