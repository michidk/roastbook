CREATE TABLE "media_cleanup_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"storage_path" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_cleanup_jobs_storage_path_unique" UNIQUE("storage_path")
);
--> statement-breakpoint
DELETE FROM "shot_taste_tags" duplicate
USING "shot_taste_tags" original
WHERE duplicate."shot_id" = original."shot_id"
  AND duplicate."taste_tag_id" = original."taste_tag_id"
  AND duplicate."id" > original."id";
--> statement-breakpoint
DELETE FROM "cafe_visit_taste_tags" duplicate
USING "cafe_visit_taste_tags" original
WHERE duplicate."cafe_visit_id" = original."cafe_visit_id"
  AND duplicate."taste_tag_id" = original."taste_tag_id"
  AND duplicate."id" > original."id";
--> statement-breakpoint
WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "bean_id" ORDER BY "id") AS position
  FROM "bean_images"
  WHERE "is_thumbnail" = true
)
UPDATE "bean_images"
SET "is_thumbnail" = false
FROM ranked
WHERE "bean_images"."id" = ranked."id" AND ranked.position > 1;
--> statement-breakpoint
WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "gear_id" ORDER BY "id") AS position
  FROM "gear_images"
  WHERE "is_thumbnail" = true
)
UPDATE "gear_images"
SET "is_thumbnail" = false
FROM ranked
WHERE "gear_images"."id" = ranked."id" AND ranked.position > 1;
--> statement-breakpoint
CREATE INDEX "media_cleanup_jobs_created_at_idx" ON "media_cleanup_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bean_images_bean_id_idx" ON "bean_images" USING btree ("bean_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bean_images_one_thumbnail_idx" ON "bean_images" USING btree ("bean_id") WHERE "bean_images"."is_thumbnail" = true;--> statement-breakpoint
CREATE INDEX "beans_created_at_idx" ON "beans" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "beans_roaster_id_idx" ON "beans" USING btree ("roaster_id");--> statement-breakpoint
CREATE INDEX "cafe_visit_images_visit_id_idx" ON "cafe_visit_images" USING btree ("cafe_visit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cafe_visit_taste_tags_visit_tag_idx" ON "cafe_visit_taste_tags" USING btree ("cafe_visit_id","taste_tag_id");--> statement-breakpoint
CREATE INDEX "cafe_visit_taste_tags_taste_tag_id_idx" ON "cafe_visit_taste_tags" USING btree ("taste_tag_id");--> statement-breakpoint
CREATE INDEX "cafe_visits_visited_at_idx" ON "cafe_visits" USING btree ("visited_at");--> statement-breakpoint
CREATE INDEX "cafe_visits_coffee_shop_id_idx" ON "cafe_visits" USING btree ("coffee_shop_id");--> statement-breakpoint
CREATE INDEX "cafe_visits_bean_id_idx" ON "cafe_visits" USING btree ("bean_id");--> statement-breakpoint
CREATE INDEX "coffee_shop_images_shop_id_idx" ON "coffee_shop_images" USING btree ("coffee_shop_id");--> statement-breakpoint
CREATE INDEX "coffee_shops_created_at_idx" ON "coffee_shops" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "coffee_shops_city_idx" ON "coffee_shops" USING btree ("city");--> statement-breakpoint
CREATE INDEX "gear_created_at_idx" ON "gear" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "gear_images_gear_id_idx" ON "gear_images" USING btree ("gear_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gear_images_one_thumbnail_idx" ON "gear_images" USING btree ("gear_id") WHERE "gear_images"."is_thumbnail" = true;--> statement-breakpoint
CREATE INDEX "recipes_brewing_method_id_idx" ON "recipes" USING btree ("brewing_method_id");--> statement-breakpoint
CREATE INDEX "recipes_bean_id_idx" ON "recipes" USING btree ("bean_id");--> statement-breakpoint
CREATE INDEX "shot_images_shot_id_idx" ON "shot_images" USING btree ("shot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shot_taste_tags_shot_tag_idx" ON "shot_taste_tags" USING btree ("shot_id","taste_tag_id");--> statement-breakpoint
CREATE INDEX "shot_taste_tags_taste_tag_id_idx" ON "shot_taste_tags" USING btree ("taste_tag_id");--> statement-breakpoint
CREATE INDEX "shots_created_at_idx" ON "shots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "shots_bean_id_idx" ON "shots" USING btree ("bean_id");--> statement-breakpoint
CREATE INDEX "shots_machine_id_idx" ON "shots" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "shots_grinder_id_idx" ON "shots" USING btree ("grinder_id");--> statement-breakpoint
CREATE INDEX "shots_basket_id_idx" ON "shots" USING btree ("basket_id");--> statement-breakpoint
ALTER TABLE "basket_details" ADD CONSTRAINT "basket_details_dose_nonnegative" CHECK ("basket_details"."nominal_dose_grams" >= 0);--> statement-breakpoint
ALTER TABLE "beans" ADD CONSTRAINT "beans_weight_nonnegative" CHECK ("beans"."weight" >= 0);--> statement-breakpoint
ALTER TABLE "beans" ADD CONSTRAINT "beans_price_nonnegative" CHECK ("beans"."price" >= 0);--> statement-breakpoint
ALTER TABLE "beans" ADD CONSTRAINT "beans_currency_check" CHECK ("beans"."price_currency" in ('EUR', 'USD', 'GBP', 'CHF'));--> statement-breakpoint
ALTER TABLE "cafe_visits" ADD CONSTRAINT "cafe_visits_price_nonnegative" CHECK ("cafe_visits"."price" >= 0);--> statement-breakpoint
ALTER TABLE "cafe_visits" ADD CONSTRAINT "cafe_visits_rating_check" CHECK ("cafe_visits"."rating" between 1 and 5);--> statement-breakpoint
ALTER TABLE "cafe_visits" ADD CONSTRAINT "cafe_visits_currency_check" CHECK ("cafe_visits"."currency" in ('EUR', 'USD', 'GBP', 'CHF'));--> statement-breakpoint
ALTER TABLE "coffee_shops" ADD CONSTRAINT "coffee_shops_rating_check" CHECK ("coffee_shops"."rating" between 1 and 5);--> statement-breakpoint
ALTER TABLE "coffee_shops" ADD CONSTRAINT "coffee_shops_latitude_check" CHECK ("coffee_shops"."latitude" between -90 and 90);--> statement-breakpoint
ALTER TABLE "coffee_shops" ADD CONSTRAINT "coffee_shops_longitude_check" CHECK ("coffee_shops"."longitude" between -180 and 180);--> statement-breakpoint
ALTER TABLE "gear" ADD CONSTRAINT "gear_purchase_price_nonnegative" CHECK ("gear"."purchase_price" >= 0);--> statement-breakpoint
ALTER TABLE "gear" ADD CONSTRAINT "gear_currency_check" CHECK ("gear"."price_currency" in ('EUR', 'USD', 'GBP', 'CHF'));--> statement-breakpoint
ALTER TABLE "machine_settings" ADD CONSTRAINT "machine_settings_measurements_nonnegative" CHECK (("machine_settings"."brew_pressure_opv_bar" is null or "machine_settings"."brew_pressure_opv_bar" >= 0)
        and ("machine_settings"."default_preinfusion_time_seconds" is null or "machine_settings"."default_preinfusion_time_seconds" >= 0)
        and ("machine_settings"."default_preinfusion_pressure_bar" is null or "machine_settings"."default_preinfusion_pressure_bar" >= 0)
        and ("machine_settings"."default_flow_limit_ml_per_second" is null or "machine_settings"."default_flow_limit_ml_per_second" >= 0)
        and ("machine_settings"."volumetric_shot_volume_ml" is null or "machine_settings"."volumetric_shot_volume_ml" >= 0)
        and ("machine_settings"."steam_temperature_celsius" is null or "machine_settings"."steam_temperature_celsius" >= 0)
        and ("machine_settings"."steam_pressure_bar" is null or "machine_settings"."steam_pressure_bar" >= 0));--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_measurements_nonnegative" CHECK (("recipes"."dose_grams" is null or "recipes"."dose_grams" >= 0)
        and ("recipes"."brew_water_grams" is null or "recipes"."brew_water_grams" >= 0)
        and ("recipes"."yield_grams" is null or "recipes"."yield_grams" >= 0)
        and ("recipes"."shot_time_seconds" is null or "recipes"."shot_time_seconds" >= 0)
        and ("recipes"."brew_temperature_celsius" is null or "recipes"."brew_temperature_celsius" >= 0)
        and ("recipes"."preinfusion_time_seconds" is null or "recipes"."preinfusion_time_seconds" >= 0)
        and ("recipes"."preinfusion_pressure_bar" is null or "recipes"."preinfusion_pressure_bar" >= 0)
        and ("recipes"."bloom_time_seconds" is null or "recipes"."bloom_time_seconds" >= 0)
        and ("recipes"."brew_pressure_bar" is null or "recipes"."brew_pressure_bar" >= 0)
        and ("recipes"."flow_rate_ml_per_second" is null or "recipes"."flow_rate_ml_per_second" >= 0)
        and ("recipes"."tamp_force_kg" is null or "recipes"."tamp_force_kg" >= 0));--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_rating_check" CHECK ("shots"."rating" between 1 and 5);--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_measurements_nonnegative" CHECK (("shots"."dose_grams" is null or "shots"."dose_grams" >= 0)
        and ("shots"."brew_water_grams" is null or "shots"."brew_water_grams" >= 0)
        and ("shots"."yield_grams" is null or "shots"."yield_grams" >= 0)
        and ("shots"."shot_time_seconds" is null or "shots"."shot_time_seconds" >= 0)
        and ("shots"."brew_temperature_celsius" is null or "shots"."brew_temperature_celsius" >= 0)
        and ("shots"."preinfusion_time_seconds" is null or "shots"."preinfusion_time_seconds" >= 0)
        and ("shots"."preinfusion_pressure_bar" is null or "shots"."preinfusion_pressure_bar" >= 0)
        and ("shots"."bloom_time_seconds" is null or "shots"."bloom_time_seconds" >= 0)
        and ("shots"."brew_pressure_bar" is null or "shots"."brew_pressure_bar" >= 0)
        and ("shots"."flow_rate_ml_per_second" is null or "shots"."flow_rate_ml_per_second" >= 0)
        and ("shots"."tamp_force_kg" is null or "shots"."tamp_force_kg" >= 0));--> statement-breakpoint
ALTER TABLE "taste_tags" ADD CONSTRAINT "taste_tags_extraction_axis_check" CHECK ("taste_tags"."extraction_axis" between -1 and 1);--> statement-breakpoint
ALTER TABLE "taste_tags" ADD CONSTRAINT "taste_tags_strength_axis_check" CHECK ("taste_tags"."strength_axis" between -1 and 1);
