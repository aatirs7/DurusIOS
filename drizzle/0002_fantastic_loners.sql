PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sync_state` (
	`profile_id` integer PRIMARY KEY NOT NULL,
	`cursor` text,
	`last_success_at` integer,
	`last_attempt_at` integer,
	`last_error` text,
	`backoff_until` integer,
	`schema_revision` integer DEFAULT 3 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sync_state`("profile_id", "cursor", "last_success_at", "last_attempt_at", "last_error", "backoff_until", "schema_revision") SELECT "profile_id", "cursor", "last_success_at", "last_attempt_at", "last_error", "backoff_until", "schema_revision" FROM `sync_state`;--> statement-breakpoint
DROP TABLE `sync_state`;--> statement-breakpoint
ALTER TABLE `__new_sync_state` RENAME TO `sync_state`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `lessons` ADD `deck` text DEFAULT 'book' NOT NULL;