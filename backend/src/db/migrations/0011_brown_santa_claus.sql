CREATE TABLE "community_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"judul" text NOT NULL,
	"isi" text NOT NULL,
	"kategori" text NOT NULL,
	"metode_terapi" text NOT NULL,
	"diarsipkan" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"isi" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_reply_helpful" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reply_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_community_reply_helpful_reply_user" UNIQUE("reply_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "education_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"judul" text NOT NULL,
	"ringkasan" text NOT NULL,
	"isi" text NOT NULL,
	"tipe_konten" text NOT NULL,
	"metode_terapi" text NOT NULL,
	"gambar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_replies" ADD CONSTRAINT "community_replies_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_replies" ADD CONSTRAINT "community_replies_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reply_helpful" ADD CONSTRAINT "community_reply_helpful_reply_id_community_replies_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."community_replies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reply_helpful" ADD CONSTRAINT "community_reply_helpful_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_community_posts_created" ON "community_posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_community_posts_kategori" ON "community_posts" USING btree ("kategori","diarsipkan");--> statement-breakpoint
CREATE INDEX "idx_community_posts_metode" ON "community_posts" USING btree ("metode_terapi","diarsipkan");--> statement-breakpoint
CREATE INDEX "idx_community_posts_user" ON "community_posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_community_replies_post" ON "community_replies" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_education_metode" ON "education_content" USING btree ("metode_terapi");--> statement-breakpoint
CREATE INDEX "idx_education_tipe" ON "education_content" USING btree ("tipe_konten");