ALTER TABLE "shot_accessory_gear" RENAME TO "brew_accessory_gear";--> statement-breakpoint
ALTER TABLE "shot_images" RENAME TO "brew_images";--> statement-breakpoint
ALTER TABLE "shot_taste_tags" RENAME TO "brew_taste_tags";--> statement-breakpoint
ALTER TABLE "shots" RENAME TO "brews";--> statement-breakpoint
ALTER TABLE "brew_accessory_gear" RENAME COLUMN "shot_id" TO "brew_id";--> statement-breakpoint
ALTER TABLE "brew_images" RENAME COLUMN "shot_id" TO "brew_id";--> statement-breakpoint
ALTER TABLE "brew_taste_tags" RENAME COLUMN "shot_id" TO "brew_id";--> statement-breakpoint
ALTER TABLE "brews" DROP CONSTRAINT "shots_ratio_basis_check";--> statement-breakpoint
ALTER TABLE "brews" DROP CONSTRAINT "shots_paper_filter_position_check";--> statement-breakpoint
ALTER TABLE "brews" DROP CONSTRAINT "shots_rating_check";--> statement-breakpoint
ALTER TABLE "brews" DROP CONSTRAINT "shots_extraction_balance_check";--> statement-breakpoint
ALTER TABLE "brews" DROP CONSTRAINT "shots_sensory_ratings_check";--> statement-breakpoint
ALTER TABLE "brews" DROP CONSTRAINT "shots_measurements_nonnegative";--> statement-breakpoint
ALTER TABLE "brew_accessory_gear" DROP CONSTRAINT "shot_accessory_gear_shot_id_shots_id_fk";
--> statement-breakpoint
ALTER TABLE "brew_accessory_gear" DROP CONSTRAINT "shot_accessory_gear_gear_id_gear_id_fk";
--> statement-breakpoint
ALTER TABLE "brew_images" DROP CONSTRAINT "shot_images_shot_id_shots_id_fk";
--> statement-breakpoint
ALTER TABLE "brew_taste_tags" DROP CONSTRAINT "shot_taste_tags_shot_id_shots_id_fk";
--> statement-breakpoint
ALTER TABLE "brew_taste_tags" DROP CONSTRAINT "shot_taste_tags_taste_tag_id_taste_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "brews" DROP CONSTRAINT "shots_brewing_method_id_brewing_methods_id_fk";
--> statement-breakpoint
ALTER TABLE "brews" DROP CONSTRAINT "shots_bean_id_beans_id_fk";
--> statement-breakpoint
ALTER TABLE "brews" DROP CONSTRAINT "shots_recipe_id_recipes_id_fk";
--> statement-breakpoint
ALTER TABLE "brews" DROP CONSTRAINT "shots_machine_id_gear_id_fk";
--> statement-breakpoint
ALTER TABLE "brews" DROP CONSTRAINT "shots_grinder_id_gear_id_fk";
--> statement-breakpoint
ALTER TABLE "brews" DROP CONSTRAINT "shots_basket_id_gear_id_fk";
--> statement-breakpoint
DROP INDEX "shot_accessory_gear_shot_gear_idx";--> statement-breakpoint
DROP INDEX "shot_accessory_gear_gear_id_idx";--> statement-breakpoint
DROP INDEX "shot_images_shot_id_idx";--> statement-breakpoint
DROP INDEX "shot_taste_tags_shot_tag_idx";--> statement-breakpoint
DROP INDEX "shot_taste_tags_taste_tag_id_idx";--> statement-breakpoint
DROP INDEX "shots_created_at_idx";--> statement-breakpoint
DROP INDEX "shots_brewed_at_idx";--> statement-breakpoint
DROP INDEX "shots_brewing_method_id_idx";--> statement-breakpoint
DROP INDEX "shots_bean_id_idx";--> statement-breakpoint
DROP INDEX "shots_recipe_id_idx";--> statement-breakpoint
DROP INDEX "shots_machine_id_idx";--> statement-breakpoint
DROP INDEX "shots_grinder_id_idx";--> statement-breakpoint
DROP INDEX "shots_basket_id_idx";--> statement-breakpoint
ALTER TABLE "brew_accessory_gear" ADD CONSTRAINT "brew_accessory_gear_brew_id_brews_id_fk" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brew_accessory_gear" ADD CONSTRAINT "brew_accessory_gear_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brew_images" ADD CONSTRAINT "brew_images_brew_id_brews_id_fk" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brew_taste_tags" ADD CONSTRAINT "brew_taste_tags_brew_id_brews_id_fk" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brew_taste_tags" ADD CONSTRAINT "brew_taste_tags_taste_tag_id_taste_tags_id_fk" FOREIGN KEY ("taste_tag_id") REFERENCES "public"."taste_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_brewing_method_id_brewing_methods_id_fk" FOREIGN KEY ("brewing_method_id") REFERENCES "public"."brewing_methods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_bean_id_beans_id_fk" FOREIGN KEY ("bean_id") REFERENCES "public"."beans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_machine_id_gear_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_grinder_id_gear_id_fk" FOREIGN KEY ("grinder_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_basket_id_gear_id_fk" FOREIGN KEY ("basket_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brew_accessory_gear_brew_gear_idx" ON "brew_accessory_gear" USING btree ("brew_id","gear_id");--> statement-breakpoint
CREATE INDEX "brew_accessory_gear_gear_id_idx" ON "brew_accessory_gear" USING btree ("gear_id");--> statement-breakpoint
CREATE INDEX "brew_images_brew_id_idx" ON "brew_images" USING btree ("brew_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brew_taste_tags_brew_tag_idx" ON "brew_taste_tags" USING btree ("brew_id","taste_tag_id");--> statement-breakpoint
CREATE INDEX "brew_taste_tags_taste_tag_id_idx" ON "brew_taste_tags" USING btree ("taste_tag_id");--> statement-breakpoint
CREATE INDEX "brews_created_at_idx" ON "brews" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "brews_brewed_at_idx" ON "brews" USING btree ("brewed_at");--> statement-breakpoint
CREATE INDEX "brews_brewing_method_id_idx" ON "brews" USING btree ("brewing_method_id");--> statement-breakpoint
CREATE INDEX "brews_bean_id_idx" ON "brews" USING btree ("bean_id");--> statement-breakpoint
CREATE INDEX "brews_recipe_id_idx" ON "brews" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "brews_machine_id_idx" ON "brews" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "brews_grinder_id_idx" ON "brews" USING btree ("grinder_id");--> statement-breakpoint
CREATE INDEX "brews_basket_id_idx" ON "brews" USING btree ("basket_id");--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_ratio_basis_check" CHECK ("brews"."ratio_basis" in ('target_yield', 'brew_water'));--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_paper_filter_position_check" CHECK ("brews"."paper_filter_position" in ('none', 'top', 'bottom', 'both'));--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_rating_check" CHECK ("brews"."rating" between 1 and 5);--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_extraction_balance_check" CHECK ("brews"."extraction_balance" between 1 and 5);--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_sensory_ratings_check" CHECK (("brews"."bitterness" is null or "brews"."bitterness" between 1 and 5)
        and ("brews"."acidity" is null or "brews"."acidity" between 1 and 5)
        and ("brews"."sweetness" is null or "brews"."sweetness" between 1 and 5)
        and ("brews"."body" is null or "brews"."body" between 1 and 5)
        and ("brews"."astringency" is null or "brews"."astringency" between 1 and 5));--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_measurements_nonnegative" CHECK (("brews"."dose_grams" is null or "brews"."dose_grams" >= 0)
        and ("brews"."brew_water_grams" is null or "brews"."brew_water_grams" >= 0)
        and ("brews"."yield_grams" is null or "brews"."yield_grams" >= 0)
        and ("brews"."shot_time_seconds" is null or "brews"."shot_time_seconds" >= 0)
        and ("brews"."brew_temperature_celsius" is null or "brews"."brew_temperature_celsius" >= 0)
        and ("brews"."preinfusion_time_seconds" is null or "brews"."preinfusion_time_seconds" >= 0)
        and ("brews"."preinfusion_pressure_bar" is null or "brews"."preinfusion_pressure_bar" >= 0)
        and ("brews"."bloom_time_seconds" is null or "brews"."bloom_time_seconds" >= 0)
        and ("brews"."brew_pressure_bar" is null or "brews"."brew_pressure_bar" >= 0)
        and ("brews"."flow_rate_ml_per_second" is null or "brews"."flow_rate_ml_per_second" >= 0)
        and ("brews"."tamp_force_kg" is null or "brews"."tamp_force_kg" >= 0));