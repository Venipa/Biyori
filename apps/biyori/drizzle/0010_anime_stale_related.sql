ALTER TABLE `anime` ADD `stale_at` text;--> statement-breakpoint
ALTER TABLE `anime` ADD `related` text DEFAULT '[]' NOT NULL;
