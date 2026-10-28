CREATE TABLE "replication_changes" (
	"sequence" serial PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"document_id" text NOT NULL,
	"document" jsonb NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "sync_id" text DEFAULT md5(random()::text || clock_timestamp()::text) NOT NULL;--> statement-breakpoint
CREATE INDEX "replication_changes_entity_sequence_idx" ON "replication_changes" USING btree ("entity","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_sync_id_unique" ON "recipes" USING btree ("sync_id");