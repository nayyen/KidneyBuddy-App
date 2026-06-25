CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama_lengkap" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"nomor_telepon" text NOT NULL,
	"tanggal_lahir" date NOT NULL,
	"metode_terapi_aktif" text,
	"tanggal_mulai_terapi" date,
	"role" text DEFAULT 'Pasien' NOT NULL,
	"riwayat_terapi" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
