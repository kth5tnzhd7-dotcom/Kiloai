import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const links = sqliteTable("links", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  destinationUrl: text("destination_url").notNull(),
  safePageUrl: text("safe_page_url").default(""),
  moneyPageUrl: text("money_page_url").default(""),
  whitePageTitle: text("white_page_title").notNull().default("Welcome"),
  whitePageDescription: text("white_page_description")
    .notNull()
    .default("Loading..."),
  customDomain: text("custom_domain").default(""),
  password: text("password").default(""),
  expiryDate: text("expiry_date").default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  maxClicks: integer("max_clicks").notNull().default(0),
  redirectDelay: integer("redirect_delay").notNull().default(3),
  cloakType: text("cloak_type").notNull().default("redirect"),
  trafficBotMode: text("traffic_bot_mode").notNull().default("block"),
  trafficBotRedirectUrl: text("traffic_bot_redirect_url").default(""),
  trafficBlockedReferrers: text("traffic_blocked_referrers").default("[]"),
  trafficAllowedReferrers: text("traffic_allowed_referrers").default("[]"),
  trafficBlockedUserAgents: text("traffic_blocked_user_agents").default("[]"),
  trafficAllowedUserAgents: text("traffic_allowed_user_agents").default("[]"),
  geoAllowedCountries: text("geo_allowed_countries").default("[]"),
  geoBlockedCountries: text("geo_blocked_countries").default("[]"),
  blockFacebookReviewers: integer("block_facebook_reviewers", { mode: "boolean" }).notNull().default(true),
  blockTikTokReviewers: integer("block_tiktok_reviewers", { mode: "boolean" }).notNull().default(true),
  blockGoogleReviewers: integer("block_google_reviewers", { mode: "boolean" }).notNull().default(true),
  nicegramAdUrl: text("nicegram_ad_url").default(""),
  clicks: integer("clicks").notNull().default(0),
  realClicks: integer("real_clicks").notNull().default(0),
  blockedClicks: integer("blocked_clicks").notNull().default(0),
  safePageClicks: integer("safe_page_clicks").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const clickEvents = sqliteTable("click_events", {
  id: text("id").primaryKey(),
  linkSlug: text("link_slug").notNull(),
  timestamp: text("timestamp").notNull(),
  device: text("device").notNull().default("unknown"),
  browser: text("browser").notNull().default("Unknown"),
  browserVersion: text("browser_version").default(""),
  os: text("os").notNull().default("Unknown"),
  osVersion: text("os_version").default(""),
  referrer: text("referrer").default("Direct"),
  language: text("language").default("Unknown"),
  screenWidth: integer("screen_width").default(0),
  screenHeight: integer("screen_height").default(0),
  timezone: text("timezone").default("Unknown"),
  ip: text("ip").default("Unknown"),
  country: text("country").default("Unknown"),
  isBot: integer("is_bot", { mode: "boolean" }).notNull().default(false),
  botType: text("bot_type").default("Unknown"),
  verdict: text("verdict").notNull().default("allow"),
});

export const domains = sqliteTable("domains", {
  id: text("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  verificationCode: text("verification_code").notNull(),
  linkedSlug: text("linked_slug").default(""),
  sslEnabled: integer("ssl_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const deployments = sqliteTable("deployments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fileCount: integer("file_count").notNull().default(0),
  totalSize: integer("total_size").notNull().default(0),
  deployUrl: text("deploy_url").default(""),
  cpanelUrl: text("cpanel_url").default(""),
  cpanelUsername: text("cpanel_username").default(""),
  cpanelToken: text("cpanel_token").default(""),
  cpanelDir: text("cpanel_dir").default("public_html"),
  status: text("status").notNull().default("pending"),
  linkedSlug: text("linked_slug").default(""),
  createdAt: text("created_at").notNull(),
});

export const cloneHistory = sqliteTable("clone_history", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
  fileCount: integer("file_count").notNull().default(0),
  totalSize: integer("total_size").notNull().default(0),
  filesJson: text("files_json").default("[]"),
  createdAt: text("created_at").notNull(),
});

export const savedScripts = sqliteTable("saved_scripts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  injectHead: text("inject_head").default(""),
  injectBodyStart: text("inject_body_start").default(""),
  injectBodyEnd: text("inject_body_end").default(""),
  createdAt: text("created_at").notNull(),
});
