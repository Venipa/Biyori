CREATE TABLE `account` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`avatar_url` text DEFAULT '' NOT NULL
);
