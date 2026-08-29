ALTER TABLE "recipes" DROP CONSTRAINT "recipes_measurements_nonnegative";--> statement-breakpoint
ALTER TABLE "brews" DROP CONSTRAINT "brews_measurements_nonnegative";--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "target_time_seconds" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "brews" ADD COLUMN "target_time_seconds" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_measurements_nonnegative" CHECK (("recipes"."dose_grams" is null or "recipes"."dose_grams" >= 0)
        and ("recipes"."brew_water_grams" is null or "recipes"."brew_water_grams" >= 0)
        and ("recipes"."yield_grams" is null or "recipes"."yield_grams" >= 0)
        and ("recipes"."shot_time_seconds" is null or "recipes"."shot_time_seconds" >= 0)
        and ("recipes"."target_time_seconds" is null or "recipes"."target_time_seconds" >= 0)
        and ("recipes"."brew_temperature_celsius" is null or "recipes"."brew_temperature_celsius" >= 0)
        and ("recipes"."preinfusion_time_seconds" is null or "recipes"."preinfusion_time_seconds" >= 0)
        and ("recipes"."preinfusion_pressure_bar" is null or "recipes"."preinfusion_pressure_bar" >= 0)
        and ("recipes"."bloom_time_seconds" is null or "recipes"."bloom_time_seconds" >= 0)
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
        and ("brews"."brew_pressure_bar" is null or "brews"."brew_pressure_bar" >= 0)
        and ("brews"."flow_rate_ml_per_second" is null or "brews"."flow_rate_ml_per_second" >= 0)
        and ("brews"."tamp_force_kg" is null or "brews"."tamp_force_kg" >= 0));