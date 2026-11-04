CREATE TABLE `journal_command_receipts` (
	`owner_id` text NOT NULL,
	`command_id` text NOT NULL,
	`applied_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	PRIMARY KEY(`owner_id`, `command_id`)
);
--> statement-breakpoint
CREATE TABLE `journal_id_reservations` (
	`owner_id` text NOT NULL,
	`table_name` text NOT NULL,
	`id` integer NOT NULL,
	PRIMARY KEY(`table_name`, `id`)
);
--> statement-breakpoint
CREATE TABLE `journal_sync_revisions` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`value` integer DEFAULT 0 NOT NULL
);
