CREATE TABLE "brewing_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"enabled_parameters" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brewing_methods_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "shot_presets" RENAME TO "recipes";--> statement-breakpoint
ALTER SEQUENCE "shot_presets_id_seq" RENAME TO "recipes_id_seq";--> statement-breakpoint
ALTER TABLE "recipes" RENAME CONSTRAINT "shot_presets_pkey" TO "recipes_pkey";--> statement-breakpoint
ALTER TABLE "recipes" DROP CONSTRAINT "shot_presets_ratio_basis_check";--> statement-breakpoint
ALTER TABLE "recipes" DROP CONSTRAINT "shot_presets_paper_filter_position_check";--> statement-breakpoint
ALTER TABLE "recipes" DROP CONSTRAINT "shot_presets_bean_id_beans_id_fk";
--> statement-breakpoint
ALTER TABLE "recipes" DROP CONSTRAINT "shot_presets_machine_id_gear_id_fk";
--> statement-breakpoint
ALTER TABLE "recipes" DROP CONSTRAINT "shot_presets_grinder_id_gear_id_fk";
--> statement-breakpoint
ALTER TABLE "recipes" DROP CONSTRAINT "shot_presets_basket_id_gear_id_fk";
--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "brewing_method_id" integer;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "brewing_method_id" integer;--> statement-breakpoint
INSERT INTO "brewing_methods" ("name", "enabled_parameters") VALUES
	('Espresso', ARRAY['machineId','doseGrams','grinderId','grindSetting','yieldGrams','shotTimeSeconds','brewTemperatureCelsius','preinfusionTimeSeconds','preinfusionPressureBar','brewPressureBar','basketId','usesPuckScreen','paperFilterPosition','distributionMethod','tampForceKg','accessoryGearIds']::text[]),
	('Pour over', ARRAY['doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','brewTemperatureCelsius','bloomTimeSeconds','flowRateMlPerSecond','accessoryGearIds']::text[]),
	('AeroPress', ARRAY['doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','brewTemperatureCelsius','bloomTimeSeconds','paperFilterPosition','accessoryGearIds']::text[]),
	('French press', ARRAY['doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','brewTemperatureCelsius','bloomTimeSeconds','accessoryGearIds']::text[]),
	('Moka pot', ARRAY['doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','brewTemperatureCelsius','accessoryGearIds']::text[]),
	('Cold brew', ARRAY['doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','accessoryGearIds']::text[]),
	('Other', ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','brewTemperatureCelsius','preinfusionTimeSeconds','preinfusionPressureBar','bloomTimeSeconds','brewPressureBar','flowRateMlPerSecond','basketId','usesPuckScreen','paperFilterPosition','distributionMethod','tampForceKg','accessoryGearIds']::text[]);--> statement-breakpoint
UPDATE "recipes" SET "brewing_method_id" = CASE "brewing_method"::text
	WHEN 'espresso' THEN (SELECT "id" FROM "brewing_methods" WHERE "name" = 'Espresso')
	WHEN 'pourover' THEN (SELECT "id" FROM "brewing_methods" WHERE "name" = 'Pour over')
	WHEN 'aeropress' THEN (SELECT "id" FROM "brewing_methods" WHERE "name" = 'AeroPress')
	WHEN 'french_press' THEN (SELECT "id" FROM "brewing_methods" WHERE "name" = 'French press')
	WHEN 'moka_pot' THEN (SELECT "id" FROM "brewing_methods" WHERE "name" = 'Moka pot')
	WHEN 'cold_brew' THEN (SELECT "id" FROM "brewing_methods" WHERE "name" = 'Cold brew')
	ELSE (SELECT "id" FROM "brewing_methods" WHERE "name" = 'Other')
END;--> statement-breakpoint
UPDATE "shots" SET "brewing_method_id" = CASE "brewing_method"::text
	WHEN 'espresso' THEN (SELECT "id" FROM "brewing_methods" WHERE "name" = 'Espresso')
	WHEN 'pourover' THEN (SELECT "id" FROM "brewing_methods" WHERE "name" = 'Pour over')
	WHEN 'aeropress' THEN (SELECT "id" FROM "brewing_methods" WHERE "name" = 'AeroPress')
	WHEN 'french_press' THEN (SELECT "id" FROM "brewing_methods" WHERE "name" = 'French press')
	WHEN 'moka_pot' THEN (SELECT "id" FROM "brewing_methods" WHERE "name" = 'Moka pot')
	WHEN 'cold_brew' THEN (SELECT "id" FROM "brewing_methods" WHERE "name" = 'Cold brew')
	ELSE (SELECT "id" FROM "brewing_methods" WHERE "name" = 'Other')
END;--> statement-breakpoint
ALTER TABLE "recipes" ALTER COLUMN "brewing_method_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shots" ALTER COLUMN "brewing_method_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_brewing_method_id_brewing_methods_id_fk" FOREIGN KEY ("brewing_method_id") REFERENCES "public"."brewing_methods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_bean_id_beans_id_fk" FOREIGN KEY ("bean_id") REFERENCES "public"."beans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_machine_id_gear_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_grinder_id_gear_id_fk" FOREIGN KEY ("grinder_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_basket_id_gear_id_fk" FOREIGN KEY ("basket_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_brewing_method_id_brewing_methods_id_fk" FOREIGN KEY ("brewing_method_id") REFERENCES "public"."brewing_methods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "brewing_method";--> statement-breakpoint
ALTER TABLE "shots" DROP COLUMN "brewing_method";--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_ratio_basis_check" CHECK ("recipes"."ratio_basis" in ('target_yield', 'brew_water'));--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_paper_filter_position_check" CHECK ("recipes"."paper_filter_position" in ('none', 'top', 'bottom', 'both'));--> statement-breakpoint
DROP TYPE "public"."brewing_method";
