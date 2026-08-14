CREATE TABLE "ai_request_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_type" text NOT NULL,
	"model" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"request_payload" jsonb NOT NULL,
	"response_payload" jsonb,
	"error_message" text,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_request_logs_status_check" CHECK ("ai_request_logs"."status" in ('in_progress', 'succeeded', 'failed', 'aborted'))
);
--> statement-breakpoint
CREATE INDEX "ai_request_logs_created_at_idx" ON "ai_request_logs" USING btree ("created_at");