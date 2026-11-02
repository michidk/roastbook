CREATE TABLE "ai_weekly_usage" (
	"user_id" text NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_weekly_usage_user_id_week_start_pk" PRIMARY KEY("user_id","week_start"),
	CONSTRAINT "ai_weekly_usage_requests_check" CHECK ("ai_weekly_usage"."requests" >= 0)
);
--> statement-breakpoint
ALTER TABLE "ai_request_logs" ADD COLUMN "provider_mode" text DEFAULT 'byo' NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "ai_provider_mode" text DEFAULT 'provided' NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "ai_weekly_limit" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_weekly_usage" ADD CONSTRAINT "ai_weekly_usage_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_request_logs_provider_created_idx" ON "ai_request_logs" USING btree ("provider_mode","created_at");--> statement-breakpoint
ALTER TABLE "ai_request_logs" ADD CONSTRAINT "ai_request_logs_provider_check" CHECK ("ai_request_logs"."provider_mode" in ('provided', 'byo'));--> statement-breakpoint
ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_ai_limit_check" CHECK ("auth_users"."ai_weekly_limit" >= 0);--> statement-breakpoint
ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_ai_mode_check" CHECK ("auth_users"."ai_provider_mode" in ('provided', 'byo'));--> statement-breakpoint
UPDATE auth_users SET ai_provider_mode = 'byo' WHERE id IN (SELECT user_id FROM ai_provider_credentials) OR id = 'local';
--> statement-breakpoint
UPDATE auth_users SET last_login_at = (SELECT max(created_at) FROM auth_sessions WHERE user_id = auth_users.id);
--> statement-breakpoint
REVOKE ALL ON ai_weekly_usage FROM roastbook_journal;
