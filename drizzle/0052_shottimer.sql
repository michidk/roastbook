CREATE TABLE "shottimer" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"token_hash" text,
	"latest_shot_seconds" double precision,
	"latest_shot_at" timestamp,
	"target_time_seconds" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shottimer_singleton_check" CHECK ("shottimer"."id" = 1)
);
