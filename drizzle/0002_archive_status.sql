-- Beans: Rename is_finished to is_archived (same semantics - finished means archived)
ALTER TABLE "beans" RENAME COLUMN "is_finished" TO "is_archived";--> statement-breakpoint

-- Gear: Add is_archived column, migrate data from is_active (inverted), then drop is_active
ALTER TABLE "gear" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "gear" SET "is_archived" = NOT "is_active";--> statement-breakpoint
ALTER TABLE "gear" DROP COLUMN "is_active";
