ALTER TABLE "brews" DROP CONSTRAINT "brews_recipe_id_recipes_id_fk";
--> statement-breakpoint
DROP INDEX "brews_recipe_id_idx";--> statement-breakpoint
ALTER TABLE "brews" DROP COLUMN "recipe_id";