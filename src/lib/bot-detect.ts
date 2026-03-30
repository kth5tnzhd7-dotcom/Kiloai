export type TrafficVerdict = "allow" | "block" | "suspicious";

export interface BotCheckResult {
  isBot: boolean;
  verdict: TrafficVerdict;
  score: number;
  reasons: string[];
  botType: string;
}

const KNOWN_BOT_PATTERNS = [
  { pattern: /googlebot|google-inspectiontool/i, type: "Google Bot" },
  { pattern: /bingbot|bingpreview/i, type: "Bing Bot" },
  { pattern: /yandexbot|yandeximages/i, type: "Yandex Bot" },
  { pattern: /baiduspider|baiduboxapp/i, type: "Baidu Bot" },
  { pattern: /duckduckbot/i, type: "DuckDuckGo Bot" },
  { pattern: /slurp|yahoo/i, type: "Yahoo Bot" },
  { pattern: /facebookexternalhit|facebookcatalog/i, type: "Facebook Bot" },
  { pattern: /twitterbot|xbot/i, type: "Twitter/X Bot" },
  { pattern: /linkedinbot/i, type: "LinkedIn Bot" },
  { pattern: /pinterest|pinbot/i, type: "Pinterest Bot" },
  { pattern: /telegrambot/i, type: "Telegram Bot" },
  { pattern: /whatsapp/i, type: "WhatsApp Bot" },
  { pattern: /applebot/i, type: "Apple Bot" },
  { pattern: /discordbot/i, type: "Discord Bot" },
  { pattern: /slackbot/i, type: "Slack Bot" },
  { pattern: /redditbot/i, type: "Reddit Bot" },
  { pattern: /embedly|quora/i, type: "Embed Bot" },
  { pattern: /skypeuripreview/i, type: "Skype Bot" },
];

const CRAWLER_PATTERNS = [
  /crawl|spider|scrape|fetch|bot\b|robot/i,
  /httpclient|http_request|libwww|wget|curl/i,
  /python-requests|python-urllib|go-http/i,
  /java\/|ruby\/|perl\/|php\//i,
  /headless|phantom|selenium|puppeteer|playwright/i,
  /cypress|webdriver|chromedriver/i,
];

const SUSPICIOUS_PATTERNS = [
  /adsbot|adidxbot|mediapartners/i,
  /semrush|ahrefs|mj12bot|dotbot/i,
  /petalbot|bytespider|ccbot/i,
  /gptbot|chatgpt-user|ccbot/i,
  /claudebot|anthropic/i,
];

const BLOCKED_USER_AGENTS = [
  /scrapy|nutch|heritrix/i,
  /masscan|zgrab|nmap/i,
  /sqlmap|nikto|nuclei/i,
];

export function detectBot(
  userAgent: string,
  headers: Record<string, string>,
  referrer: string
): BotCheckResult {
  const reasons: string[] = [];
  let score = 0;
  let isBot = false;
  let botType = "Unknown Bot";

  if (!userAgent || userAgent.trim() === "") {
    return {
      isBot: true,
      verdict: "block",
      score: 100,
      reasons: ["Empty user agent"],
      botType: "No UA",
    };
  }

  for (const { pattern, type } of KNOWN_BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return {
        isBot: true,
        verdict: "block",
        score: 100,
        reasons: [`Known bot: ${type}`],
        botType: type,
      };
    }
  }

  for (const pattern of BLOCKED_USER_AGENTS) {
    if (pattern.test(userAgent)) {
      return {
        isBot: true,
        verdict: "block",
        score: 100,
        reasons: ["Blocked malicious bot"],
        botType: "Malicious Bot",
      };
    }
  }

  for (const pattern of CRAWLER_PATTERNS) {
    if (pattern.test(userAgent)) {
      score += 50;
      reasons.push("Crawler pattern detected");
      isBot = true;
      botType = "Crawler";
      break;
    }
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(userAgent)) {
      score += 40;
      reasons.push("Suspicious bot pattern");
      isBot = true;
      botType = "Suspicious Bot";
      break;
    }
  }

  const accept = headers["accept"] || "";
  if (!accept.includes("text/html") && !accept.includes("*/*")) {
    score += 20;
    reasons.push("Missing HTML accept header");
  }

  const acceptLang = headers["accept-language"] || "";
  if (!acceptLang) {
    score += 15;
    reasons.push("Missing Accept-Language header");
  }

  const acceptEnc = headers["accept-encoding"] || "";
  if (!acceptEnc) {
    score += 15;
    reasons.push("Missing Accept-Encoding header");
  }

  const secChUa = headers["sec-ch-ua"] || "";
  if (!secChUa && userAgent.includes("Chrome")) {
    score += 25;
    reasons.push("Chrome UA without sec-ch-ua hint");
  }

  const connection = headers["connection"] || "";
  if (connection.toLowerCase() === "close") {
    score += 10;
    reasons.push("Connection: close header");
  }

  if (!headers["sec-fetch-site"] && !headers["sec-fetch-mode"]) {
    score += 10;
    reasons.push("Missing Sec-Fetch headers");
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(referrer)) {
    score += 15;
    reasons.push("IP-based referrer");
  }

  if (userAgent.length < 20) {
    score += 20;
    reasons.push("Very short user agent");
  }

  if (userAgent.length > 500) {
    score += 15;
    reasons.push("Abnormally long user agent");
  }

  if (
    /MacIntel|Win64|Linux x86_64/.test(userAgent) &&
    !/Chrome|Firefox|Safari|Edge|Opera/.test(userAgent)
  ) {
    score += 20;
    reasons.push("Platform without known browser");
  }

  let verdict: TrafficVerdict;
  if (score >= 60) {
    verdict = "block";
    isBot = true;
  } else if (score >= 30) {
    verdict = "suspicious";
  } else {
    verdict = "allow";
  }

  return { isBot, verdict, score, reasons, botType };
}

export function getBotAction(
  result: BotCheckResult,
  botMode: "block" | "redirect" | "allow",
  redirectUrl: string
): { action: "allow" | "block" | "redirect"; url: string } {
  if (result.verdict === "allow") {
    return { action: "allow", url: "" };
  }

  if (botMode === "allow") {
    return { action: "allow", url: "" };
  }

  if (botMode === "redirect" && redirectUrl) {
    return { action: "redirect", url: redirectUrl };
  }

  return { action: "block", url: "" };
}
