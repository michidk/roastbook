ALTER TABLE "ai_weekly_usage" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "ai_weekly_usage" CASCADE;--> statement-breakpoint
ALTER TABLE "auth_users" DROP CONSTRAINT "auth_users_ai_limit_check";--> statement-breakpoint
ALTER TABLE "auth_users" DROP CONSTRAINT "auth_users_ai_mode_check";--> statement-breakpoint
ALTER TABLE "auth_users" DROP COLUMN "ai_provider_mode";--> statement-breakpoint
ALTER TABLE "auth_users" DROP COLUMN "ai_weekly_limit";