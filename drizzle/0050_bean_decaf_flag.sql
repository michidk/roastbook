ALTER TABLE "beans" ADD COLUMN "is_decaf" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "beans" SET "is_decaf" = true, "type" = NULL WHERE "type" = 'decaf';--> statement-breakpoint
ALTER TABLE "beans" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."bean_type";--> statement-breakpoint
CREATE TYPE "public"."bean_type" AS ENUM('espresso', 'filter', 'omni');--> statement-breakpoint
ALTER TABLE "beans" ALTER COLUMN "type" SET DATA TYPE "public"."bean_type" USING "type"::"public"."bean_type";
