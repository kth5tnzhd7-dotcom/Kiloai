CREATE TABLE `saved_scripts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`inject_head` text DEFAULT '',
	`inject_body_start` text DEFAULT '',
	`inject_body_end` text DEFAULT '',
	`created_at` text NOT NULL
);
