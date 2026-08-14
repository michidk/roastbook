ALTER TABLE "taste_tags" ALTER COLUMN "hint" SET DEFAULT '';--> statement-breakpoint
UPDATE "taste_tags" SET "hint" = '' WHERE "hint" IS NULL;--> statement-breakpoint
ALTER TABLE "taste_tags" ALTER COLUMN "hint" SET NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_request_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_type" text NOT NULL,
	"model" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"request_payload" jsonb NOT NULL,
	"response_payload" jsonb,
	"error_message" text,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"cached_prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_usd" numeric(18, 10),
	"duration_ms" integer,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_request_logs_status_check" CHECK ("ai_request_logs"."status" in ('in_progress', 'succeeded', 'failed', 'aborted')),
	CONSTRAINT "ai_request_logs_usage_check" CHECK ("ai_request_logs"."prompt_tokens" >= 0
		and "ai_request_logs"."cached_prompt_tokens" >= 0
		and "ai_request_logs"."cached_prompt_tokens" <= "ai_request_logs"."prompt_tokens"
		and "ai_request_logs"."completion_tokens" >= 0
		and "ai_request_logs"."total_tokens" >= 0
		and ("ai_request_logs"."estimated_cost_usd" is null or "ai_request_logs"."estimated_cost_usd" >= 0))
);--> statement-breakpoint
ALTER TABLE "ai_request_logs" ADD COLUMN IF NOT EXISTS "cached_prompt_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_request_logs" ADD COLUMN IF NOT EXISTS "estimated_cost_usd" numeric(18, 10);--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'ai_request_logs_usage_check'
			AND conrelid = 'ai_request_logs'::regclass
	) THEN
		ALTER TABLE "ai_request_logs" ADD CONSTRAINT "ai_request_logs_usage_check" CHECK ("ai_request_logs"."prompt_tokens" >= 0
			and "ai_request_logs"."cached_prompt_tokens" >= 0
			and "ai_request_logs"."cached_prompt_tokens" <= "ai_request_logs"."prompt_tokens"
			and "ai_request_logs"."completion_tokens" >= 0
			and "ai_request_logs"."total_tokens" >= 0
			and ("ai_request_logs"."estimated_cost_usd" is null or "ai_request_logs"."estimated_cost_usd" >= 0));
	END IF;
END
$$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_request_logs_created_at_idx" ON "ai_request_logs" USING btree ("created_at");--> statement-breakpoint
INSERT INTO "taste_tags" (
	"name",
	"category",
	"hint",
	"extraction_axis",
	"strength_axis"
)
VALUES
	('Fruity', 'Flavor', 'Flavor wheel: Fruity. A general ripe-fruit aroma when no more specific fruit family fits.', 0.30, 0.50),
	('Berry', 'Flavor', 'Flavor wheel: Fruity → Berry. Strawberry, raspberry, blueberry, or blackberry-like aromas.', 0.30, 0.50),
	('Dried fruit', 'Flavor', 'Flavor wheel: Fruity → Dried fruit. Raisin, prune, date, or dried-berry aromas.', 0.40, 0.60),
	('Citrus', 'Flavor', 'Flavor wheel: Fruity → Citrus fruit. Lemon, lime, orange, grapefruit, or citrus-peel aromas.', 0.40, 0.40),
	('Stone fruit', 'Flavor', 'Flavor wheel: Fruity → Other fruit. Peach, apricot, plum, nectarine, or cherry-like aromas.', 0.35, 0.50),
	('Tropical fruit', 'Flavor', 'Flavor wheel: Fruity → Other fruit. Pineapple, mango, papaya, passion fruit, or coconut-like aromas.', 0.35, 0.55),
	('Floral', 'Flavor', 'Flavor wheel: Floral. Jasmine, rose, chamomile, or tea-like aromas.', 0.20, 0.30),
	('Chocolate', 'Flavor', 'Flavor wheel: Nutty/Cocoa → Cocoa. Milk chocolate, dark chocolate, or cocoa-like aromas.', 0.60, 0.70),
	('Nutty', 'Flavor', 'Flavor wheel: Nutty/Cocoa → Nutty. Almond, hazelnut, peanut, or walnut-like aromas.', 0.50, 0.60),
	('Caramel', 'Flavor', 'Flavor wheel: Sweet → Brown sugar. Caramelized, honey, molasses, or maple-like sweet aromatics.', 0.60, 0.60),
	('Vanilla', 'Flavor', 'Flavor wheel: Sweet → Vanilla. Vanilla, marshmallow, or custard-like sweet aromatics.', 0.50, 0.50),
	('Spicy', 'Flavor', 'Flavor wheel: Spices. Cinnamon, clove, nutmeg, anise, or pepper-like aromas.', 0.70, 0.60),
	('Roasted', 'Flavor', 'Flavor wheel: Roasted. Toasted, coffee-like, smoky, or tobacco-like aromas.', 0.75, 0.75),
	('Cereal', 'Flavor', 'Flavor wheel: Roasted → Cereal. Grain, malt, or fresh-bread aromas.', 0.55, 0.45),
	('Green / vegetative', 'Flavor', 'Flavor wheel: Green/Vegetative. Fresh, herbal, peapod, hay, or unripe-plant aromas.', 0.25, 0.40),
	('Earthy', 'Flavor', 'Flavor wheel: Other → Musty/Earthy. Soil, damp wood, or dusty aromas.', 0.70, 0.70),
	('Fermented', 'Flavor', 'Flavor wheel: Sour/Fermented → Fermented. Winey, overripe, or alcohol-like aromas, separate from acidity intensity.', 0.45, 0.70),
	('Woody', 'Flavor', 'Flavor wheel: Other → Papery/Musty → Woody. Dry wood, bark, cedar, or pencil-shaving aromas.', 0.70, 0.55)
ON CONFLICT ("name") DO UPDATE SET
	"category" = excluded."category",
	"hint" = excluded."hint",
	"extraction_axis" = excluded."extraction_axis",
	"strength_axis" = excluded."strength_axis";
