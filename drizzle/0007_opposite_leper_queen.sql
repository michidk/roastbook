CREATE TABLE "recipe_gear" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"gear_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brewing_method" "brewing_method" DEFAULT 'espresso' NOT NULL,
	"default_dose_grams" numeric(5, 2),
	"default_yield_grams" numeric(5, 2),
	"default_brew_time_seconds" integer,
	"default_grind_setting" text,
	"default_water_temp_celsius" numeric(4, 1),
	"default_pressure" numeric(3, 1),
	"notes" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shots" DROP CONSTRAINT "shots_grinder_id_gear_id_fk";
--> statement-breakpoint
ALTER TABLE "shots" DROP CONSTRAINT "shots_machine_id_gear_id_fk";
--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "recipe_id" integer;--> statement-breakpoint
ALTER TABLE "recipe_gear" ADD CONSTRAINT "recipe_gear_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_gear" ADD CONSTRAINT "recipe_gear_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" DROP COLUMN "grinder_id";--> statement-breakpoint
ALTER TABLE "shots" DROP COLUMN "machine_id";--> statement-breakpoint
ALTER TABLE "shots" DROP COLUMN "brewing_method";
