ALTER TABLE "places" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;