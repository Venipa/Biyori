ALTER TABLE `anime` ADD `popularity` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `anime` ADD `rated_rank` integer;--> statement-breakpoint
ALTER TABLE `anime` ADD `popular_rank` integer;--> statement-breakpoint
ALTER TABLE `anime` ADD `tags` text DEFAULT '[]' NOT NULL;