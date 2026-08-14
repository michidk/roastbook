CREATE TABLE "ai_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer NOT NULL,
	"cached_prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer NOT NULL,
	"total_tokens" integer NOT NULL,
	"estimated_cost_usd" numeric(18, 10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_tokens_nonnegative_check" CHECK ("ai_usage"."prompt_tokens" >= 0
        and "ai_usage"."cached_prompt_tokens" >= 0
        and "ai_usage"."cached_prompt_tokens" <= "ai_usage"."prompt_tokens"
        and "ai_usage"."completion_tokens" >= 0
        and "ai_usage"."total_tokens" >= 0),
	CONSTRAINT "ai_usage_cost_nonnegative_check" CHECK ("ai_usage"."estimated_cost_usd" is null or "ai_usage"."estimated_cost_usd" >= 0)
);
--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "default_map_latitude" SET DEFAULT 48.8566;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "default_map_longitude" SET DEFAULT 2.3522;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "default_map_label" SET DEFAULT 'Paris, France';--> statement-breakpoint
ALTER TABLE "coffee_shops" ADD COLUMN "wants_to_visit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "default_list_view" text DEFAULT 'cards' NOT NULL;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "bitterness" integer;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "acidity" integer;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "sweetness" integer;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "body" integer;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "astringency" integer;--> statement-breakpoint
ALTER TABLE "taste_tags" ADD COLUMN "hint" text;--> statement-breakpoint
CREATE INDEX "ai_usage_request_id_idx" ON "ai_usage" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "ai_usage_created_at_idx" ON "ai_usage" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_list_view_check" CHECK ("settings"."default_list_view" in ('cards', 'table'));--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_sensory_ratings_check" CHECK (("shots"."bitterness" is null or "shots"."bitterness" between 1 and 5)
        and ("shots"."acidity" is null or "shots"."acidity" between 1 and 5)
        and ("shots"."sweetness" is null or "shots"."sweetness" between 1 and 5)
        and ("shots"."body" is null or "shots"."body" between 1 and 5)
        and ("shots"."astringency" is null or "shots"."astringency" between 1 and 5));