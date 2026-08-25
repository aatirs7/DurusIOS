CREATE TABLE `account` (
	`clerk_user_id` text PRIMARY KEY NOT NULL,
	`profile_id` integer NOT NULL,
	`display_name` text,
	`is_active` integer DEFAULT false NOT NULL,
	`bootstrapped_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `card_hearts` (
	`profile_id` integer NOT NULL,
	`card_id` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`device_id` text NOT NULL,
	`dirty` integer DEFAULT true NOT NULL,
	PRIMARY KEY(`profile_id`, `card_id`),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `card_hearts_profile_idx` ON `card_hearts` (`profile_id`);--> statement-breakpoint
CREATE TABLE `card_states` (
	`profile_id` integer NOT NULL,
	`card_id` integer NOT NULL,
	`direction` text NOT NULL,
	`ease` real DEFAULT 2.5 NOT NULL,
	`interval_days` real DEFAULT 0 NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`due_at` integer NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`profile_id`, `card_id`, `direction`),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `card_states_due_idx` ON `card_states` (`profile_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `card_suspensions` (
	`profile_id` integer NOT NULL,
	`card_id` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`device_id` text NOT NULL,
	`dirty` integer DEFAULT true NOT NULL,
	PRIMARY KEY(`profile_id`, `card_id`),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `card_suspensions_profile_idx` ON `card_suspensions` (`profile_id`);--> statement-breakpoint
CREATE TABLE `cards` (
	`id` integer PRIMARY KEY NOT NULL,
	`lesson_id` integer NOT NULL,
	`type` text DEFAULT 'vocab' NOT NULL,
	`arabic` text NOT NULL,
	`english` text NOT NULL,
	`transliteration` text,
	`gender` text,
	`plural` text,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cards_lesson_idx` ON `cards` (`lesson_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `cards_lesson_arabic_idx` ON `cards` (`lesson_id`,`arabic`);--> statement-breakpoint
CREATE TABLE `device` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` integer PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`grammar_note` text,
	`unlocked_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lessons_number_unique` ON `lessons` (`number`);--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clerk_user_id` text,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_clerk_user_idx` ON `profiles` (`clerk_user_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`card_id` integer NOT NULL,
	`direction` text NOT NULL,
	`grade` text NOT NULL,
	`ms_to_answer` integer NOT NULL,
	`reviewed_at` integer NOT NULL,
	`practice` integer DEFAULT false NOT NULL,
	`capped` integer DEFAULT false NOT NULL,
	`fuzz` real,
	`retracted_at` integer,
	`client_id` text NOT NULL,
	`device_id` text NOT NULL,
	`synced_at` integer,
	`server_seq` integer,
	`sync_error` text,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_client_id_idx` ON `reviews` (`client_id`);--> statement-breakpoint
CREATE INDEX `reviews_reviewed_at_idx` ON `reviews` (`profile_id`,`reviewed_at`);--> statement-breakpoint
CREATE INDEX `reviews_fold_idx` ON `reviews` (`profile_id`,`card_id`,`direction`,`reviewed_at`);--> statement-breakpoint
CREATE INDEX `reviews_outbox_idx` ON `reviews` (`profile_id`,`synced_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`profile_id` integer PRIMARY KEY NOT NULL,
	`current_lesson` integer DEFAULT 1 NOT NULL,
	`new_per_day` integer DEFAULT 12 NOT NULL,
	`max_reviews` integer DEFAULT 120 NOT NULL,
	`show_harakat` integer DEFAULT true NOT NULL,
	`speed_window_ms` integer DEFAULT 2000 NOT NULL,
	`reminders_on` integer DEFAULT false NOT NULL,
	`reminder_hour` integer DEFAULT 9 NOT NULL,
	`second_reminder_on` integer DEFAULT true NOT NULL,
	`reminder_hour_2` integer DEFAULT 20 NOT NULL,
	`class_day_reminder` integer DEFAULT true NOT NULL,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`current_lesson_since` integer NOT NULL,
	`haptics_enabled` integer DEFAULT true NOT NULL,
	`reduce_motion` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	`field_updated_at` text DEFAULT '{}' NOT NULL,
	`dirty` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`profile_id` integer PRIMARY KEY NOT NULL,
	`cursor` text,
	`last_success_at` integer,
	`last_attempt_at` integer,
	`last_error` text,
	`backoff_until` integer,
	`schema_revision` integer DEFAULT 1 NOT NULL
);
