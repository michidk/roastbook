CREATE TABLE "journal_command_receipts" (
	"owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL,
	"command_id" text NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "journal_command_receipts_owner_id_command_id_pk" PRIMARY KEY("owner_id","command_id")
);
--> statement-breakpoint
CREATE TABLE "journal_id_reservations" (
	"owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL,
	"table_name" text NOT NULL,
	"id" integer NOT NULL,
	CONSTRAINT "journal_id_reservations_table_name_id_pk" PRIMARY KEY("table_name","id")
);
--> statement-breakpoint
CREATE TABLE "journal_sync_revisions" (
	"owner_id" text PRIMARY KEY DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL,
	"value" bigint DEFAULT 0 NOT NULL
);
