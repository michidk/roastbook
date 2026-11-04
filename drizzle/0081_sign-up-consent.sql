ALTER TABLE "auth_users" ADD COLUMN "terms_version" text;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "newsletter_opt_in" boolean DEFAULT false NOT NULL;