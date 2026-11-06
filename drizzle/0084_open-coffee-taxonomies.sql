ALTER TYPE "public"."gear_type" ADD VALUE 'filter' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."gear_type" ADD VALUE 'roaster' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."gear_type" ADD VALUE 'milk_frother' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."gear_type" ADD VALUE 'accessory' BEFORE 'other';--> statement-breakpoint
ALTER TABLE "brewer_details" DROP CONSTRAINT "brewer_details_mechanism_check";--> statement-breakpoint
ALTER TABLE "grinder_details" DROP CONSTRAINT "grinder_details_brew_range_check";--> statement-breakpoint
ALTER TABLE "grinder_details" DROP CONSTRAINT "grinder_details_burr_material_check";--> statement-breakpoint
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_measurements_nonnegative";--> statement-breakpoint
ALTER TABLE "brews" DROP CONSTRAINT "brews_measurements_nonnegative";--> statement-breakpoint
ALTER TABLE "brewing_methods" ADD COLUMN "brew_method_id" text;--> statement-breakpoint
ALTER TABLE "coffee_shops" ADD COLUMN "open_coffee_place_id" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "steep_time_seconds" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "bloom_water_grams" numeric(7, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "pour_count" integer;--> statement-breakpoint
ALTER TABLE "brews" ADD COLUMN "steep_time_seconds" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "brews" ADD COLUMN "bloom_water_grams" numeric(7, 2);--> statement-breakpoint
ALTER TABLE "brews" ADD COLUMN "pour_count" integer;--> statement-breakpoint
ALTER TABLE "brewer_details" ADD CONSTRAINT "brewer_details_mechanism_check" CHECK ("brewer_details"."mechanism" in ('percolation', 'immersion', 'hybrid', 'press', 'vacuum', 'boiling', 'other'));--> statement-breakpoint
ALTER TABLE "grinder_details" ADD CONSTRAINT "grinder_details_brew_range_check" CHECK ("grinder_details"."brew_range" <@ ARRAY['espresso', 'filter', 'turkish']::text[]);--> statement-breakpoint
ALTER TABLE "grinder_details" ADD CONSTRAINT "grinder_details_burr_material_check" CHECK ("grinder_details"."burr_material" in ('steel', 'ceramic', 'titanium_coated', 'other'));--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_measurements_nonnegative" CHECK (("recipes"."dose_grams" is null or "recipes"."dose_grams" >= 0)
        and ("recipes"."brew_water_grams" is null or "recipes"."brew_water_grams" >= 0)
        and ("recipes"."yield_grams" is null or "recipes"."yield_grams" >= 0)
        and ("recipes"."shot_time_seconds" is null or "recipes"."shot_time_seconds" >= 0)
        and ("recipes"."target_time_seconds" is null or "recipes"."target_time_seconds" >= 0)
        and ("recipes"."brew_temperature_celsius" is null or "recipes"."brew_temperature_celsius" >= 0)
        and ("recipes"."preinfusion_time_seconds" is null or "recipes"."preinfusion_time_seconds" >= 0)
        and ("recipes"."preinfusion_pressure_bar" is null or "recipes"."preinfusion_pressure_bar" >= 0)
        and ("recipes"."bloom_time_seconds" is null or "recipes"."bloom_time_seconds" >= 0)
        and ("recipes"."bloom_water_grams" is null or "recipes"."bloom_water_grams" >= 0)
        and ("recipes"."pour_count" is null or "recipes"."pour_count" >= 0)
        and ("recipes"."steep_time_seconds" is null or "recipes"."steep_time_seconds" >= 0)
        and ("recipes"."brew_pressure_bar" is null or "recipes"."brew_pressure_bar" >= 0)
        and ("recipes"."flow_rate_ml_per_second" is null or "recipes"."flow_rate_ml_per_second" >= 0)
        and ("recipes"."tamp_force_kg" is null or "recipes"."tamp_force_kg" >= 0));--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_measurements_nonnegative" CHECK (("brews"."dose_grams" is null or "brews"."dose_grams" >= 0)
        and ("brews"."brew_water_grams" is null or "brews"."brew_water_grams" >= 0)
        and ("brews"."yield_grams" is null or "brews"."yield_grams" >= 0)
        and ("brews"."shot_time_seconds" is null or "brews"."shot_time_seconds" >= 0)
        and ("brews"."target_time_seconds" is null or "brews"."target_time_seconds" >= 0)
        and ("brews"."brew_temperature_celsius" is null or "brews"."brew_temperature_celsius" >= 0)
        and ("brews"."preinfusion_time_seconds" is null or "brews"."preinfusion_time_seconds" >= 0)
        and ("brews"."preinfusion_pressure_bar" is null or "brews"."preinfusion_pressure_bar" >= 0)
        and ("brews"."bloom_time_seconds" is null or "brews"."bloom_time_seconds" >= 0)
        and ("brews"."bloom_water_grams" is null or "brews"."bloom_water_grams" >= 0)
        and ("brews"."pour_count" is null or "brews"."pour_count" >= 0)
        and ("brews"."steep_time_seconds" is null or "brews"."steep_time_seconds" >= 0)
        and ("brews"."brew_pressure_bar" is null or "brews"."brew_pressure_bar" >= 0)
        and ("brews"."flow_rate_ml_per_second" is null or "brews"."flow_rate_ml_per_second" >= 0)
        and ("brews"."tamp_force_kg" is null or "brews"."tamp_force_kg" >= 0));