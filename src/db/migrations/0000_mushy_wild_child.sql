CREATE TABLE `click_events` (
	`id` text PRIMARY KEY NOT NULL,
	`link_slug` text NOT NULL,
	`timestamp` text NOT NULL,
	`device` text DEFAULT 'unknown' NOT NULL,
	`browser` text DEFAULT 'Unknown' NOT NULL,
	`browser_version` text DEFAULT '',
	`os` text DEFAULT 'Unknown' NOT NULL,
	`os_version` text DEFAULT '',
	`referrer` text DEFAULT 'Direct',
	`language` text DEFAULT 'Unknown',
	`screen_width` integer DEFAULT 0,
	`screen_height` integer DEFAULT 0,
	`timezone` text DEFAULT 'Unknown',
	`ip` text DEFAULT 'Unknown',
	`country` text DEFAULT 'Unknown',
	`is_bot` integer DEFAULT false NOT NULL,
	`bot_type` text DEFAULT 'Unknown',
	`verdict` text DEFAULT 'allow' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clone_history` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`domain` text NOT NULL,
	`file_count` integer DEFAULT 0 NOT NULL,
	`total_size` integer DEFAULT 0 NOT NULL,
	`files_json` text DEFAULT '[]',
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `deployments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`file_count` integer DEFAULT 0 NOT NULL,
	`total_size` integer DEFAULT 0 NOT NULL,
	`deploy_url` text DEFAULT '',
	`cpanel_url` text DEFAULT '',
	`cpanel_username` text DEFAULT '',
	`cpanel_token` text DEFAULT '',
	`cpanel_dir` text DEFAULT 'public_html',
	`status` text DEFAULT 'pending' NOT NULL,
	`linked_slug` text DEFAULT '',
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `domains` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`verification_code` text NOT NULL,
	`linked_slug` text DEFAULT '',
	`ssl_enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domains_domain_unique` ON `domains` (`domain`);--> statement-breakpoint
CREATE TABLE `links` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`destination_url` text NOT NULL,
	`white_page_title` text DEFAULT 'Welcome' NOT NULL,
	`white_page_description` text DEFAULT 'Loading...' NOT NULL,
	`custom_domain` text DEFAULT '',
	`password` text DEFAULT '',
	`expiry_date` text DEFAULT '',
	`is_active` integer DEFAULT true NOT NULL,
	`max_clicks` integer DEFAULT 0 NOT NULL,
	`redirect_delay` integer DEFAULT 3 NOT NULL,
	`cloak_type` text DEFAULT 'redirect' NOT NULL,
	`traffic_bot_mode` text DEFAULT 'block' NOT NULL,
	`traffic_bot_redirect_url` text DEFAULT '',
	`traffic_blocked_referrers` text DEFAULT '[]',
	`traffic_allowed_referrers` text DEFAULT '[]',
	`traffic_blocked_user_agents` text DEFAULT '[]',
	`traffic_allowed_user_agents` text DEFAULT '[]',
	`nicegram_ad_url` text DEFAULT '',
	`clicks` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `links_slug_unique` ON `links` (`slug`);