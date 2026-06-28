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
CREATE TABLE "roasters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"country" text,
	"website" text,
	"instagram_handle" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shots" DROP CONSTRAINT "shots_grinder_id_gear_id_fk";
--> statement-breakpoint
ALTER TABLE "shots" DROP CONSTRAINT "shots_machine_id_gear_id_fk";
--> statement-breakpoint
ALTER TABLE "bean_images" ADD COLUMN "is_thumbnail" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "roaster_id" integer;--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "weight" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "price" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "price_currency" text DEFAULT 'EUR';--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "shop_url" text;--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cafe_visits" ADD COLUMN "bean_id" integer;--> statement-breakpoint
ALTER TABLE "gear" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "gear_images" ADD COLUMN "is_thumbnail" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "recipe_id" integer;--> statement-breakpoint
ALTER TABLE "recipe_gear" ADD CONSTRAINT "recipe_gear_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_gear" ADD CONSTRAINT "recipe_gear_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beans" ADD CONSTRAINT "beans_roaster_id_roasters_id_fk" FOREIGN KEY ("roaster_id") REFERENCES "public"."roasters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_visits" ADD CONSTRAINT "cafe_visits_bean_id_beans_id_fk" FOREIGN KEY ("bean_id") REFERENCES "public"."beans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beans" DROP COLUMN "is_finished";--> statement-breakpoint
ALTER TABLE "gear" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "shots" DROP COLUMN "grinder_id";--> statement-breakpoint
ALTER TABLE "shots" DROP COLUMN "machine_id";--> statement-breakpoint
ALTER TABLE "shots" DROP COLUMN "brewing_method";