ALTER TABLE "bean_images" ADD COLUMN "bean_purchase_id" integer;--> statement-breakpoint
UPDATE "bean_images"
SET "bean_purchase_id" = "bean_id";--> statement-breakpoint
ALTER TABLE "bean_images" ALTER COLUMN "bean_purchase_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bean_images" ADD CONSTRAINT "bean_images_purchase_bean_fk" FOREIGN KEY ("bean_purchase_id","bean_id") REFERENCES "public"."bean_purchases"("id","bean_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bean_images_bean_purchase_id_idx" ON "bean_images" USING btree ("bean_purchase_id");--> statement-breakpoint
DROP INDEX "bean_images_one_thumbnail_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "bean_images_one_thumbnail_idx" ON "bean_images" USING btree ("bean_purchase_id") WHERE "bean_images"."is_thumbnail" = true;
