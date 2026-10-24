ALTER TABLE "recipes" ADD COLUMN "client_operation_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_client_operation_id_unique" ON "recipes" USING btree ("client_operation_id");