CREATE TABLE "shot_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brewing_method" "brewing_method" DEFAULT 'espresso' NOT NULL,
	"bean_id" integer,
	"machine_id" integer,
	"dose_grams" numeric(5, 2),
	"brew_water_grams" numeric(7, 2),
	"ratio_basis" text,
	"grinder_id" integer,
	"grind_setting" text,
	"yield_grams" numeric(6, 2),
	"shot_time_seconds" numeric(8, 2),
	"brew_temperature_celsius" numeric(4, 1),
	"preinfusion_time_seconds" numeric(5, 2),
	"preinfusion_pressure_bar" numeric(4, 2),
	"bloom_time_seconds" numeric(5, 2),
	"brew_pressure_bar" numeric(4, 2),
	"flow_rate_ml_per_second" numeric(4, 2),
	"basket_id" integer,
	"uses_puck_screen" boolean,
	"paper_filter_position" text,
	"distribution_method" text,
	"tamp_force_kg" numeric(5, 2),
	"accessory_gear_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shot_presets_ratio_basis_check" CHECK ("shot_presets"."ratio_basis" in ('target_yield', 'brew_water')),
	CONSTRAINT "shot_presets_paper_filter_position_check" CHECK ("shot_presets"."paper_filter_position" in ('none', 'top', 'bottom', 'both'))
);
--> statement-breakpoint
ALTER TABLE "recipe_enabled_fields" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "recipe_gear" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "recipes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "recipe_enabled_fields" CASCADE;--> statement-breakpoint
DROP TABLE "recipe_gear" CASCADE;--> statement-breakpoint
DROP TABLE "recipes" CASCADE;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "brewing_method" "brewing_method" DEFAULT 'espresso' NOT NULL;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "dose_grams" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "brew_water_grams" numeric(7, 2);--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "ratio_basis" text;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "grinder_id" integer;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "yield_grams" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "shot_time_seconds" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "brew_temperature_celsius" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "preinfusion_time_seconds" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "preinfusion_pressure_bar" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "bloom_time_seconds" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "brew_pressure_bar" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "flow_rate_ml_per_second" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "basket_id" integer;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "uses_puck_screen" boolean;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "paper_filter_position" text;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "distribution_method" text;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "tamp_force_kg" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "accessory_gear_ids" integer[] DEFAULT '{}'::integer[] NOT NULL;--> statement-breakpoint
UPDATE "shots"
SET
	"dose_grams" = "actual_dose_grams",
	"yield_grams" = "actual_yield_grams",
	"shot_time_seconds" = "actual_shot_time_seconds",
	"brew_temperature_celsius" = "actual_temperature_celsius",
	"brew_pressure_bar" = "actual_pressure_bar";--> statement-breakpoint
ALTER TABLE "shot_presets" ADD CONSTRAINT "shot_presets_bean_id_beans_id_fk" FOREIGN KEY ("bean_id") REFERENCES "public"."beans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_presets" ADD CONSTRAINT "shot_presets_machine_id_gear_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_presets" ADD CONSTRAINT "shot_presets_grinder_id_gear_id_fk" FOREIGN KEY ("grinder_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_presets" ADD CONSTRAINT "shot_presets_basket_id_gear_id_fk" FOREIGN KEY ("basket_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_grinder_id_gear_id_fk" FOREIGN KEY ("grinder_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_basket_id_gear_id_fk" FOREIGN KEY ("basket_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" DROP COLUMN "recipe_id";--> statement-breakpoint
ALTER TABLE "shots" DROP COLUMN "actual_dose_grams";--> statement-breakpoint
ALTER TABLE "shots" DROP COLUMN "actual_yield_grams";--> statement-breakpoint
ALTER TABLE "shots" DROP COLUMN "actual_shot_time_seconds";--> statement-breakpoint
ALTER TABLE "shots" DROP COLUMN "actual_temperature_celsius";--> statement-breakpoint
ALTER TABLE "shots" DROP COLUMN "actual_pressure_bar";--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_ratio_basis_check" CHECK ("shots"."ratio_basis" in ('target_yield', 'brew_water'));--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_paper_filter_position_check" CHECK ("shots"."paper_filter_position" in ('none', 'top', 'bottom', 'both'));
