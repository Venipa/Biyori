ALTER TABLE `anime` ADD `fansub` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `anime` ADD `last_aired_episode` integer DEFAULT 0 NOT NULL;
