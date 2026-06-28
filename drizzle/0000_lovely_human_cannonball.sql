CREATE TYPE "public"."brewing_method" AS ENUM('espresso', 'pourover', 'aeropress', 'french_press', 'moka_pot', 'cold_brew', 'other');--> statement-breakpoint
CREATE TYPE "public"."gear_type" AS ENUM('espresso_machine', 'grinder', 'kettle', 'scale', 'tamper', 'wdt', 'other');--> statement-breakpoint
CREATE TYPE "public"."roast_level" AS ENUM('light', 'medium_light', 'medium', 'medium_dark', 'dark');--> statement-breakpoint
CREATE TABLE "bean_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"bean_id" integer NOT NULL,
	"storage_path" text NOT NULL,
	"original_filename" text,
	"mime_type" text,
	"size_bytes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"roaster" text,
	"origin" text,
	"region" text,
	"farm" text,
	"variety" text,
	"process" text,
	"roast_level" "roast_level",
	"roast_date" timestamp,
	"notes" text,
	"is_finished" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cafe_visit_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"cafe_visit_id" integer NOT NULL,
	"storage_path" text NOT NULL,
	"original_filename" text,
	"mime_type" text,
	"size_bytes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cafe_visit_taste_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"cafe_visit_id" integer NOT NULL,
	"taste_tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cafe_visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"place_id" integer,
	"drink_name" text,
	"drink_type" text,
	"price" numeric(6, 2),
	"currency" text DEFAULT 'EUR',
	"rating" integer,
	"notes" text,
	"visited_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gear" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"model" text,
	"type" "gear_type" NOT NULL,
	"purchase_date" timestamp,
	"purchase_price" numeric(8, 2),
	"price_currency" text DEFAULT 'EUR',
	"manual_url" text,
	"product_url" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gear_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"gear_id" integer NOT NULL,
	"storage_path" text NOT NULL,
	"original_filename" text,
	"mime_type" text,
	"size_bytes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "place_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"place_id" integer NOT NULL,
	"storage_path" text NOT NULL,
	"original_filename" text,
	"mime_type" text,
	"size_bytes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"country" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"website" text,
	"instagram_handle" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shot_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"shot_id" integer NOT NULL,
	"storage_path" text NOT NULL,
	"original_filename" text,
	"mime_type" text,
	"size_bytes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shot_taste_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"shot_id" integer NOT NULL,
	"taste_tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shots" (
	"id" serial PRIMARY KEY NOT NULL,
	"bean_id" integer,
	"grinder_id" integer,
	"machine_id" integer,
	"brewing_method" "brewing_method" DEFAULT 'espresso' NOT NULL,
	"dose_grams" numeric(5, 2),
	"yield_grams" numeric(5, 2),
	"brew_time_seconds" integer,
	"grind_setting" text,
	"water_temp_celsius" numeric(4, 1),
	"pressure" numeric(3, 1),
	"rating" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taste_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"extraction_axis" numeric(3, 2),
	"strength_axis" numeric(3, 2),
	CONSTRAINT "taste_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "bean_images" ADD CONSTRAINT "bean_images_bean_id_beans_id_fk" FOREIGN KEY ("bean_id") REFERENCES "public"."beans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_visit_images" ADD CONSTRAINT "cafe_visit_images_cafe_visit_id_cafe_visits_id_fk" FOREIGN KEY ("cafe_visit_id") REFERENCES "public"."cafe_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_visit_taste_tags" ADD CONSTRAINT "cafe_visit_taste_tags_cafe_visit_id_cafe_visits_id_fk" FOREIGN KEY ("cafe_visit_id") REFERENCES "public"."cafe_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_visit_taste_tags" ADD CONSTRAINT "cafe_visit_taste_tags_taste_tag_id_taste_tags_id_fk" FOREIGN KEY ("taste_tag_id") REFERENCES "public"."taste_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_visits" ADD CONSTRAINT "cafe_visits_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_images" ADD CONSTRAINT "gear_images_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_images" ADD CONSTRAINT "place_images_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_images" ADD CONSTRAINT "shot_images_shot_id_shots_id_fk" FOREIGN KEY ("shot_id") REFERENCES "public"."shots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_taste_tags" ADD CONSTRAINT "shot_taste_tags_shot_id_shots_id_fk" FOREIGN KEY ("shot_id") REFERENCES "public"."shots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_taste_tags" ADD CONSTRAINT "shot_taste_tags_taste_tag_id_taste_tags_id_fk" FOREIGN KEY ("taste_tag_id") REFERENCES "public"."taste_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_bean_id_beans_id_fk" FOREIGN KEY ("bean_id") REFERENCES "public"."beans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_grinder_id_gear_id_fk" FOREIGN KEY ("grinder_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_machine_id_gear_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;