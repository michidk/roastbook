ALTER TABLE "place_images" RENAME TO "coffee_shop_images";--> statement-breakpoint
ALTER TABLE "places" RENAME TO "coffee_shops";--> statement-breakpoint
ALTER TABLE "cafe_visits" RENAME COLUMN "place_id" TO "coffee_shop_id";--> statement-breakpoint
ALTER TABLE "coffee_shop_images" RENAME COLUMN "place_id" TO "coffee_shop_id";--> statement-breakpoint
ALTER TABLE "cafe_visits" DROP CONSTRAINT "cafe_visits_place_id_places_id_fk";
--> statement-breakpoint
ALTER TABLE "coffee_shop_images" DROP CONSTRAINT "place_images_place_id_places_id_fk";
--> statement-breakpoint
ALTER TABLE "cafe_visits" ADD CONSTRAINT "cafe_visits_coffee_shop_id_coffee_shops_id_fk" FOREIGN KEY ("coffee_shop_id") REFERENCES "public"."coffee_shops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffee_shop_images" ADD CONSTRAINT "coffee_shop_images_coffee_shop_id_coffee_shops_id_fk" FOREIGN KEY ("coffee_shop_id") REFERENCES "public"."coffee_shops"("id") ON DELETE cascade ON UPDATE no action;