CREATE TABLE "recipe_accessory_gear" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"gear_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shot_accessory_gear" (
	"id" serial PRIMARY KEY NOT NULL,
	"shot_id" integer NOT NULL,
	"gear_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipe_accessory_gear" ADD CONSTRAINT "recipe_accessory_gear_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_accessory_gear" ADD CONSTRAINT "recipe_accessory_gear_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_accessory_gear" ADD CONSTRAINT "shot_accessory_gear_shot_id_shots_id_fk" FOREIGN KEY ("shot_id") REFERENCES "public"."shots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_accessory_gear" ADD CONSTRAINT "shot_accessory_gear_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_accessory_gear_recipe_gear_idx" ON "recipe_accessory_gear" USING btree ("recipe_id","gear_id");--> statement-breakpoint
CREATE INDEX "recipe_accessory_gear_gear_id_idx" ON "recipe_accessory_gear" USING btree ("gear_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shot_accessory_gear_shot_gear_idx" ON "shot_accessory_gear" USING btree ("shot_id","gear_id");--> statement-breakpoint
CREATE INDEX "shot_accessory_gear_gear_id_idx" ON "shot_accessory_gear" USING btree ("gear_id");--> statement-breakpoint
INSERT INTO "recipe_accessory_gear" ("recipe_id", "gear_id")
SELECT DISTINCT recipe.id, accessory.gear_id
FROM "recipes" AS recipe
CROSS JOIN LATERAL unnest(recipe."accessory_gear_ids") AS accessory(gear_id)
INNER JOIN "gear" ON "gear"."id" = accessory.gear_id
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "shot_accessory_gear" ("shot_id", "gear_id")
SELECT DISTINCT shot.id, accessory.gear_id
FROM "shots" AS shot
CROSS JOIN LATERAL unnest(shot."accessory_gear_ids") AS accessory(gear_id)
INNER JOIN "gear" ON "gear"."id" = accessory.gear_id
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "accessory_gear_ids";--> statement-breakpoint
ALTER TABLE "shots" DROP COLUMN "accessory_gear_ids";
