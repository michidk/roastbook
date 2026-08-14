DROP INDEX "media_cleanup_jobs_created_at_idx";--> statement-breakpoint
ALTER TABLE "media_cleanup_jobs" ADD COLUMN "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "media_cleanup_jobs_next_attempt_at_idx" ON "media_cleanup_jobs" USING btree ("next_attempt_at");