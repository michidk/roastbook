ALTER TYPE "public"."gear_type" ADD VALUE 'basket' BEFORE 'other';--> statement-breakpoint
CREATE TABLE "basket_details" (
	"gear_id" integer PRIMARY KEY NOT NULL,
	"nominal_dose_grams" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "machine_settings" (
	"gear_id" integer PRIMARY KEY NOT NULL,
	"brew_pressure_opv_bar" numeric(4, 2),
	"supports_preinfusion" boolean,
	"default_preinfusion_enabled" boolean,
	"default_preinfusion_time_seconds" numeric(5, 2),
	"default_preinfusion_pressure_bar" numeric(4, 2),
	"default_flow_limit_ml_per_second" numeric(4, 2),
	"temperature_offset_celsius" numeric(4, 1),
	"volumetric_shot_volume_ml" numeric(6, 2),
	"auto_stop_mode" text,
	"steam_temperature_celsius" numeric(4, 1),
	"steam_pressure_bar" numeric(4, 2),
	CONSTRAINT "machine_settings_auto_stop_mode_check" CHECK ("machine_settings"."auto_stop_mode" in ('manual', 'weight', 'time', 'volume'))
);
--> statement-breakpoint
CREATE TABLE "recipe_enabled_fields" (
	"recipe_id" integer NOT NULL,
	"field_key" text NOT NULL,
	CONSTRAINT "recipe_enabled_fields_recipe_id_field_key_pk" PRIMARY KEY("recipe_id","field_key"),
	CONSTRAINT "recipe_enabled_fields_key_check" CHECK ("recipe_enabled_fields"."field_key" in ('bean', 'target_dose', 'brew_water', 'grinder', 'grind_setting', 'target_yield', 'brew_ratio', 'target_time', 'brew_temperature', 'preinfusion_time', 'preinfusion_pressure', 'bloom_time', 'target_pressure', 'target_flow_rate', 'basket', 'puck_screen', 'paper_filter', 'distribution_method', 'tamp_force', 'accessories', 'notes'))
);
--> statement-breakpoint
ALTER TABLE "recipes" RENAME COLUMN "default_dose_grams" TO "target_dose_grams";--> statement-breakpoint
ALTER TABLE "recipes" RENAME COLUMN "default_grind_setting" TO "grind_setting";--> statement-breakpoint
ALTER TABLE "recipes" RENAME COLUMN "default_yield_grams" TO "target_yield_grams";--> statement-breakpoint
ALTER TABLE "recipes" RENAME COLUMN "default_brew_time_seconds" TO "target_time_min_seconds";--> statement-breakpoint
ALTER TABLE "recipes" RENAME COLUMN "default_water_temp_celsius" TO "brew_temperature_celsius";--> statement-breakpoint
ALTER TABLE "recipes" RENAME COLUMN "default_pressure" TO "target_brew_pressure_bar";--> statement-breakpoint
ALTER TABLE "shots" RENAME COLUMN "dose_grams" TO "actual_dose_grams";--> statement-breakpoint
ALTER TABLE "shots" RENAME COLUMN "yield_grams" TO "actual_yield_grams";--> statement-breakpoint
ALTER TABLE "shots" RENAME COLUMN "brew_time_seconds" TO "actual_shot_time_seconds";--> statement-breakpoint
ALTER TABLE "shots" RENAME COLUMN "water_temp_celsius" TO "actual_temperature_celsius";--> statement-breakpoint
ALTER TABLE "shots" RENAME COLUMN "pressure" TO "actual_pressure_bar";--> statement-breakpoint
ALTER TABLE "recipes" ALTER COLUMN "target_yield_grams" SET DATA TYPE numeric(6, 2) USING "target_yield_grams"::numeric(6, 2);--> statement-breakpoint
ALTER TABLE "recipes" ALTER COLUMN "target_time_min_seconds" SET DATA TYPE numeric(8, 2) USING "target_time_min_seconds"::numeric(8, 2);--> statement-breakpoint
ALTER TABLE "recipes" ALTER COLUMN "target_brew_pressure_bar" SET DATA TYPE numeric(4, 2) USING "target_brew_pressure_bar"::numeric(4, 2);--> statement-breakpoint
ALTER TABLE "shots" ALTER COLUMN "actual_dose_grams" SET DATA TYPE numeric(6, 2) USING "actual_dose_grams"::numeric(6, 2);--> statement-breakpoint
ALTER TABLE "shots" ALTER COLUMN "actual_yield_grams" SET DATA TYPE numeric(6, 2) USING "actual_yield_grams"::numeric(6, 2);--> statement-breakpoint
ALTER TABLE "shots" ALTER COLUMN "actual_shot_time_seconds" SET DATA TYPE numeric(6, 2) USING "actual_shot_time_seconds"::numeric(6, 2);--> statement-breakpoint
ALTER TABLE "shots" ALTER COLUMN "actual_pressure_bar" SET DATA TYPE numeric(4, 2) USING "actual_pressure_bar"::numeric(4, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "bean_id" integer;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "brew_water_grams" numeric(7, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "ratio_basis" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "grinder_id" integer;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "target_time_max_seconds" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "preinfusion_time_seconds" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "preinfusion_pressure_bar" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "bloom_time_seconds" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "target_flow_rate_ml_per_second" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "basket_id" integer;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "uses_puck_screen" boolean;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "paper_filter_position" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "distribution_method" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "tamp_force_kg" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "machine_id" integer;--> statement-breakpoint
UPDATE "recipes"
SET "target_time_max_seconds" = "target_time_min_seconds"
WHERE "target_time_min_seconds" IS NOT NULL;--> statement-breakpoint
UPDATE "recipes"
SET "ratio_basis" = 'target_yield'
WHERE "target_dose_grams" IS NOT NULL AND "target_yield_grams" IS NOT NULL;--> statement-breakpoint
UPDATE "recipes" AS "recipe"
SET "grinder_id" = "single_grinder"."gear_id"
FROM (
	SELECT "recipe_gear"."recipe_id", min("recipe_gear"."gear_id") AS "gear_id"
	FROM "recipe_gear"
	INNER JOIN "gear" ON "gear"."id" = "recipe_gear"."gear_id"
	WHERE "gear"."type" = 'grinder'
	GROUP BY "recipe_gear"."recipe_id"
	HAVING count(DISTINCT "recipe_gear"."gear_id") = 1
) AS "single_grinder"
WHERE "recipe"."id" = "single_grinder"."recipe_id";--> statement-breakpoint
INSERT INTO "recipe_enabled_fields" ("recipe_id", "field_key")
SELECT "id", "field_key"
FROM "recipes"
CROSS JOIN LATERAL (
	VALUES
		('target_dose', "target_dose_grams" IS NOT NULL),
		('grind_setting', "grind_setting" IS NOT NULL),
		('target_yield', "target_yield_grams" IS NOT NULL),
		('brew_ratio', "ratio_basis" IS NOT NULL),
		('target_time', "target_time_min_seconds" IS NOT NULL),
		('brew_temperature', "brew_temperature_celsius" IS NOT NULL),
		('target_pressure', "target_brew_pressure_bar" IS NOT NULL),
		('notes', "notes" IS NOT NULL)
) AS "legacy_field"("field_key", "enabled")
WHERE "enabled";--> statement-breakpoint
INSERT INTO "recipe_enabled_fields" ("recipe_id", "field_key")
SELECT DISTINCT "recipe_id", 'accessories'
FROM "recipe_gear";--> statement-breakpoint
ALTER TABLE "basket_details" ADD CONSTRAINT "basket_details_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_settings" ADD CONSTRAINT "machine_settings_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_enabled_fields" ADD CONSTRAINT "recipe_enabled_fields_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_bean_id_beans_id_fk" FOREIGN KEY ("bean_id") REFERENCES "public"."beans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_grinder_id_gear_id_fk" FOREIGN KEY ("grinder_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_basket_id_gear_id_fk" FOREIGN KEY ("basket_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_machine_id_gear_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_ratio_basis_check" CHECK ("recipes"."ratio_basis" in ('target_yield', 'brew_water'));--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_paper_filter_position_check" CHECK ("recipes"."paper_filter_position" in ('none', 'top', 'bottom', 'both'));--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_target_time_range_check" CHECK ("recipes"."target_time_min_seconds" is null or "recipes"."target_time_max_seconds" is null or "recipes"."target_time_min_seconds" <= "recipes"."target_time_max_seconds");
