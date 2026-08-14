CREATE TYPE "public"."bean_type" AS ENUM('espresso', 'filter', 'decaf');--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "type" "bean_type";