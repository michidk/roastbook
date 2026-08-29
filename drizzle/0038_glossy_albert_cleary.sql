CREATE TABLE "cafe_visit_drink_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"cafe_visit_id" integer NOT NULL,
	"option_value_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drink_option_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drink_option_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "drink_option_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"name" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drink_type_option_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"drink_type_id" integer NOT NULL,
	"option_group_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drink_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drink_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "brew_drink_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"brew_id" integer NOT NULL,
	"option_value_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cafe_visits" ADD COLUMN "drink_type_id" integer;--> statement-breakpoint
ALTER TABLE "brews" ADD COLUMN "drink_type_id" integer;--> statement-breakpoint
INSERT INTO "drink_types" ("name") VALUES
	('Espresso'),
	('Doppio'),
	('Ristretto'),
	('Lungo'),
	('Americano'),
	('Latte'),
	('Cappuccino'),
	('Flat White'),
	('Cortado'),
	('Macchiato'),
	('Mocha'),
	('Pour Over'),
	('Filter'),
	('Cold Brew'),
	('Iced Coffee'),
	('Other')
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
INSERT INTO "drink_types" ("name")
SELECT DISTINCT trim(coalesce(nullif("drink_name", ''), "drink_type"))
FROM "cafe_visits"
WHERE trim(coalesce(nullif("drink_name", ''), "drink_type", '')) <> ''
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "cafe_visits"
SET "drink_type_id" = "drink_types"."id"
FROM "drink_types"
WHERE lower("drink_types"."name") = lower(trim(coalesce(nullif("cafe_visits"."drink_name", ''), "cafe_visits"."drink_type")));--> statement-breakpoint
INSERT INTO "drink_option_groups" ("name") VALUES ('Milk')
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
INSERT INTO "drink_option_values" ("group_id", "name")
SELECT "id", "milk_name"
FROM "drink_option_groups"
CROSS JOIN (VALUES
	('Whole milk'),
	('Skim milk'),
	('Oat milk'),
	('Soy milk'),
	('Almond milk'),
	('Coconut milk'),
	('Lactose-free milk')
) AS "defaults"("milk_name")
WHERE "drink_option_groups"."name" = 'Milk'
;--> statement-breakpoint
INSERT INTO "drink_type_option_groups" ("drink_type_id", "option_group_id")
SELECT "drink_types"."id", "drink_option_groups"."id"
FROM "drink_types"
CROSS JOIN "drink_option_groups"
WHERE "drink_types"."name" IN ('Latte', 'Cappuccino', 'Flat White', 'Cortado', 'Macchiato', 'Mocha')
	AND "drink_option_groups"."name" = 'Milk';--> statement-breakpoint
ALTER TABLE "cafe_visit_drink_options" ADD CONSTRAINT "cafe_visit_drink_options_cafe_visit_id_cafe_visits_id_fk" FOREIGN KEY ("cafe_visit_id") REFERENCES "public"."cafe_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_visit_drink_options" ADD CONSTRAINT "cafe_visit_drink_options_option_value_id_drink_option_values_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "public"."drink_option_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drink_option_values" ADD CONSTRAINT "drink_option_values_group_id_drink_option_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."drink_option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drink_type_option_groups" ADD CONSTRAINT "drink_type_option_groups_drink_type_id_drink_types_id_fk" FOREIGN KEY ("drink_type_id") REFERENCES "public"."drink_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drink_type_option_groups" ADD CONSTRAINT "drink_type_option_groups_option_group_id_drink_option_groups_id_fk" FOREIGN KEY ("option_group_id") REFERENCES "public"."drink_option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brew_drink_options" ADD CONSTRAINT "brew_drink_options_brew_id_brews_id_fk" FOREIGN KEY ("brew_id") REFERENCES "public"."brews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brew_drink_options" ADD CONSTRAINT "brew_drink_options_option_value_id_drink_option_values_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "public"."drink_option_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cafe_visit_drink_options_visit_value_idx" ON "cafe_visit_drink_options" USING btree ("cafe_visit_id","option_value_id");--> statement-breakpoint
CREATE INDEX "cafe_visit_drink_options_value_id_idx" ON "cafe_visit_drink_options" USING btree ("option_value_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drink_option_values_group_name_idx" ON "drink_option_values" USING btree ("group_id","name");--> statement-breakpoint
CREATE INDEX "drink_option_values_group_id_idx" ON "drink_option_values" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drink_type_option_groups_type_group_idx" ON "drink_type_option_groups" USING btree ("drink_type_id","option_group_id");--> statement-breakpoint
CREATE INDEX "drink_type_option_groups_group_id_idx" ON "drink_type_option_groups" USING btree ("option_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brew_drink_options_brew_value_idx" ON "brew_drink_options" USING btree ("brew_id","option_value_id");--> statement-breakpoint
CREATE INDEX "brew_drink_options_value_id_idx" ON "brew_drink_options" USING btree ("option_value_id");--> statement-breakpoint
ALTER TABLE "cafe_visits" ADD CONSTRAINT "cafe_visits_drink_type_id_drink_types_id_fk" FOREIGN KEY ("drink_type_id") REFERENCES "public"."drink_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_drink_type_id_drink_types_id_fk" FOREIGN KEY ("drink_type_id") REFERENCES "public"."drink_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cafe_visits_drink_type_id_idx" ON "cafe_visits" USING btree ("drink_type_id");--> statement-breakpoint
CREATE INDEX "brews_drink_type_id_idx" ON "brews" USING btree ("drink_type_id");--> statement-breakpoint
ALTER TABLE "cafe_visits" DROP COLUMN "drink_name";--> statement-breakpoint
ALTER TABLE "cafe_visits" DROP COLUMN "drink_type";
