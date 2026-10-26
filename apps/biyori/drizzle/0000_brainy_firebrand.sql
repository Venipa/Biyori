CREATE TABLE `activity` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`source` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `anime` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`titles` text DEFAULT '{}' NOT NULL,
	`user_synonyms` text DEFAULT '' NOT NULL,
	`type` text NOT NULL,
	`episodes` integer NOT NULL,
	`duration_minutes` integer DEFAULT 0 NOT NULL,
	`average_score` integer NOT NULL,
	`popularity` integer DEFAULT 0 NOT NULL,
	`rated_rank` integer,
	`popular_rank` integer,
	`season` text NOT NULL,
	`airing_status` text NOT NULL,
	`genres` text DEFAULT '[]' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`producers` text DEFAULT '[]' NOT NULL,
	`synopsis` text DEFAULT '' NOT NULL,
	`folder` text DEFAULT '' NOT NULL,
	`fansub` text DEFAULT '' NOT NULL,
	`last_aired_episode` integer DEFAULT 0 NOT NULL,
	`next_airing_at` text,
	`broadcast` text,
	`start_date` text,
	`end_date` text,
	`cover_url` text DEFAULT '' NOT NULL,
	`banner_url` text DEFAULT '' NOT NULL,
	`stale_at` text,
	`related` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `episode_file` (
	`id` text PRIMARY KEY NOT NULL,
	`anime_id` integer NOT NULL,
	`episode` integer NOT NULL,
	`path` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `episode_file_path_unique` ON `episode_file` (`path`);--> statement-breakpoint
CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`anime_id` integer DEFAULT 0 NOT NULL,
	`title` text NOT NULL,
	`episode` integer NOT NULL,
	`last_modified` text NOT NULL,
	`kind` text NOT NULL,
	`advanced` integer DEFAULT 0 NOT NULL,
	`changes` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `list_entry` (
	`anime_id` integer PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`episodes_watched` integer NOT NULL,
	`score` integer,
	`started` text,
	`completed` text,
	`last_updated` text NOT NULL,
	`times_rewatched` integer DEFAULT 0 NOT NULL,
	`rewatching` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`date_started` text,
	`date_completed` text,
	`remote_entry_id` integer,
	FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `media_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`anime_id` integer NOT NULL,
	`source_url` text NOT NULL,
	`mime` text NOT NULL,
	`file_name` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `relations_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`anime_id` integer PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `torrent_archive` (
	`guid` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`link` text NOT NULL,
	`matched` integer DEFAULT 0 NOT NULL,
	`seen_at` text NOT NULL
);
