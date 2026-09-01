ALTER TABLE "recipes" ADD COLUMN "drink_type_id" integer;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_drink_type_id_drink_types_id_fk" FOREIGN KEY ("drink_type_id") REFERENCES "public"."drink_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipes_drink_type_id_idx" ON "recipes" USING btree ("drink_type_id");