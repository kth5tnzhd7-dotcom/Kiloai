ALTER TABLE `links` ADD `safe_page_url` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `links` ADD `money_page_url` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `links` ADD `geo_allowed_countries` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `links` ADD `geo_blocked_countries` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `links` ADD `block_facebook_reviewers` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `links` ADD `block_tiktok_reviewers` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `links` ADD `block_google_reviewers` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `links` ADD `real_clicks` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `links` ADD `blocked_clicks` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `links` ADD `safe_page_clicks` integer DEFAULT 0 NOT NULL;