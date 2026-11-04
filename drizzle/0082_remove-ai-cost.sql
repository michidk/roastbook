ALTER TABLE "ai_usage" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "ai_usage" CASCADE;--> statement-breakpoint
ALTER TABLE "ai_request_logs" DROP CONSTRAINT "ai_request_logs_usage_check";--> statement-breakpoint
ALTER TABLE "ai_request_logs" DROP COLUMN "estimated_cost_usd";--> statement-breakpoint
ALTER TABLE "ai_request_logs" DROP COLUMN "estimated_cost_source";--> statement-breakpoint
ALTER TABLE "ai_request_logs" DROP COLUMN "estimated_cost_version";--> statement-breakpoint
ALTER TABLE "ai_request_logs" ADD CONSTRAINT "ai_request_logs_usage_check" CHECK ("ai_request_logs"."prompt_tokens" >= 0
        and "ai_request_logs"."cached_prompt_tokens" >= 0
        and "ai_request_logs"."cached_prompt_tokens" <= "ai_request_logs"."prompt_tokens"
        and "ai_request_logs"."completion_tokens" >= 0
        and "ai_request_logs"."total_tokens" >= 0);