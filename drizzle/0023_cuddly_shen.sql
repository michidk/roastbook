ALTER TABLE "settings" ADD COLUMN "time_zone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "brewed_at" timestamp;--> statement-breakpoint
UPDATE "shots" SET "brewed_at" = "created_at" WHERE "brewed_at" IS NULL;--> statement-breakpoint
ALTER TABLE "shots" ALTER COLUMN "brewed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "shots" ALTER COLUMN "brewed_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "recipe_id" integer;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shots_brewed_at_idx" ON "shots" USING btree ("brewed_at");--> statement-breakpoint
CREATE INDEX "shots_brewing_method_id_idx" ON "shots" USING btree ("brewing_method_id");--> statement-breakpoint
CREATE INDEX "shots_recipe_id_idx" ON "shots" USING btree ("recipe_id");
