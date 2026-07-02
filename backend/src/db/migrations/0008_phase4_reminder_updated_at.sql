DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'reminder_schedule' AND column_name = 'updated_at'
	) THEN
		ALTER TABLE "reminder_schedule" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
	END IF;
END $$;--> statement-breakpoint
