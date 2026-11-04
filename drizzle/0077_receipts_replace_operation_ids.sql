-- Earlier offline clients deduplicated with operation ids. Keep them as
-- receipts, so a change those clients still hold applies at most once.
INSERT INTO "journal_command_receipts" ("owner_id", "command_id")
SELECT "owner_id", "operation_id" FROM "client_operations"
UNION SELECT "owner_id", "client_operation_id" FROM "brews" WHERE "client_operation_id" IS NOT NULL
UNION SELECT "owner_id", "client_operation_id" FROM "recipes" WHERE "client_operation_id" IS NOT NULL
UNION SELECT "owner_id", "client_operation_id" FROM "brew_images" WHERE "client_operation_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "client_operations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "replication_changes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "client_operations" CASCADE;--> statement-breakpoint
DROP TABLE "replication_changes" CASCADE;--> statement-breakpoint
DROP INDEX "recipes_client_operation_id_unique";--> statement-breakpoint
DROP INDEX "brew_images_client_operation_id_unique";--> statement-breakpoint
DROP INDEX "brews_client_operation_id_unique";--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "client_operation_id";--> statement-breakpoint
ALTER TABLE "brew_images" DROP COLUMN "client_operation_id";--> statement-breakpoint
ALTER TABLE "brews" DROP COLUMN "client_operation_id";