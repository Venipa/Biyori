ALTER TABLE `episode_file` ADD `created_at` text;--> statement-breakpoint
UPDATE `episode_file` SET `created_at` = datetime('now', '-32 days') WHERE `created_at` IS NULL;
