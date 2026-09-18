CREATE TABLE "bean_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"bean_id" integer NOT NULL,
	"purchased_at" timestamp,
	"roast_date" timestamp,
	"initial_weight_grams" numeric(7, 2),
	"price" numeric(8, 2),
	"price_currency" text DEFAULT 'EUR',
	"shop_url" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bean_purchases_weight_nonnegative" CHECK ("bean_purchases"."initial_weight_grams" >= 0),
	CONSTRAINT "bean_purchases_price_nonnegative" CHECK ("bean_purchases"."price" >= 0),
	CONSTRAINT "bean_purchases_currency_check" CHECK ("bean_purchases"."price_currency" in ('EUR', 'USD', 'GBP', 'CHF'))
);
--> statement-breakpoint
ALTER TABLE "beans" DROP CONSTRAINT "beans_weight_nonnegative";--> statement-breakpoint
ALTER TABLE "beans" DROP CONSTRAINT "beans_price_nonnegative";--> statement-breakpoint
ALTER TABLE "beans" DROP CONSTRAINT "beans_currency_check";--> statement-breakpoint
ALTER TABLE "brews" ADD COLUMN "bean_purchase_id" integer;--> statement-breakpoint
ALTER TABLE "bean_purchases" ADD CONSTRAINT "bean_purchases_bean_id_beans_id_fk" FOREIGN KEY ("bean_id") REFERENCES "public"."beans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bean_purchases_bean_id_idx" ON "bean_purchases" USING btree ("bean_id");--> statement-breakpoint
CREATE INDEX "bean_purchases_archive_created_idx" ON "bean_purchases" USING btree ("is_archived","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bean_purchases_id_bean_id_idx" ON "bean_purchases" USING btree ("id","bean_id");--> statement-breakpoint
INSERT INTO "bean_purchases" (
	"id",
	"bean_id",
	"roast_date",
	"initial_weight_grams",
	"price",
	"price_currency",
	"shop_url",
	"is_archived",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	"id",
	"roast_date",
	"weight",
	"price",
	"price_currency",
	"shop_url",
	"is_archived",
	"created_at",
	"updated_at"
FROM "beans";--> statement-breakpoint
SELECT setval(
	pg_get_serial_sequence('bean_purchases', 'id'),
	coalesce(max("id"), 1),
	max("id") is not null
)
FROM "bean_purchases";--> statement-breakpoint
UPDATE "brews"
SET "bean_purchase_id" = "bean_id"
WHERE "bean_id" is not null;--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_purchase_bean_fk" FOREIGN KEY ("bean_purchase_id","bean_id") REFERENCES "public"."bean_purchases"("id","bean_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brews_bean_purchase_id_idx" ON "brews" USING btree ("bean_purchase_id");--> statement-breakpoint
ALTER TABLE "beans" DROP COLUMN "roast_date";--> statement-breakpoint
ALTER TABLE "beans" DROP COLUMN "weight";--> statement-breakpoint
ALTER TABLE "beans" DROP COLUMN "price";--> statement-breakpoint
ALTER TABLE "beans" DROP COLUMN "price_currency";--> statement-breakpoint
ALTER TABLE "beans" DROP COLUMN "shop_url";--> statement-breakpoint
ALTER TABLE "beans" DROP COLUMN "is_archived";--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_purchase_requires_bean" CHECK ("brews"."bean_purchase_id" is null or "brews"."bean_id" is not null);
