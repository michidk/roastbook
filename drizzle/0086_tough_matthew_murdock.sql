ALTER TABLE "ai_request_logs" ADD COLUMN "image_accounting" jsonb;--> statement-breakpoint
ALTER TABLE "bean_images" ADD COLUMN "original_storage_path" text;--> statement-breakpoint
ALTER TABLE "cafe_visit_images" ADD COLUMN "original_storage_path" text;--> statement-breakpoint
ALTER TABLE "coffee_shop_images" ADD COLUMN "original_storage_path" text;--> statement-breakpoint
ALTER TABLE "gear_images" ADD COLUMN "original_storage_path" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "beautify_images" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "brew_images" ADD COLUMN "original_storage_path" text;