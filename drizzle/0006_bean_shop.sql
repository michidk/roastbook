ALTER TABLE "beans" ADD COLUMN "price" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "price_currency" text DEFAULT 'EUR';--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "shop_url" text;
