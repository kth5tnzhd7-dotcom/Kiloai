export interface PlatformCheckResult {
  isReviewer: boolean;
  platform: string;
  reason: string;
  action: "safe_page" | "block" | "allow";
}

// Known ad platform IP ranges and patterns
// These are approximate - real production systems use updated IP lists

const FACEBOOK_IP_PATTERNS = [
  /^31\.13\./,
  /^66\.220\./,
  /^69\.63\./,
  /^69\.171\./,
  /^74\.119\./,
  /^103\.4\./,
  /^129\.134\./,
  /^157\.240\./,
  /^173\.252\./,
  /^179\.60\./,
  /^185\.60\./,
  /^204\.15\./,
];

const TIKTOK_IP_PATTERNS = [
  /^71\.131\./,
  /^161\.117\./,
  /^203\.91\./,
  /^103\.75\./,
  /^119\.18\./,
  /^139\.177\./,
  /^208\.83\./,
];

const GOOGLE_IP_PATTERNS = [
  /^66\.102\./,
  /^66\.249\./,
  /^64\.233\./,
  /^72\.14\./,
  /^74\.125\./,
  /^172\.217\./,
  /^142\.250\./,
  /^216\.58\./,
  /^209\.85\./,
  /^108\.177\./,
];

const FACEBOOK_UA_PATTERNS = [
  /facebookexternalhit/i,
  /facebookcatalog/i,
  /FacebookBot/i,
  /meta-externalagent/i,
  /Meta-Inspector/i,
  /lighthouse.*facebook/i,
  /facebook.*lighthouse/i,
];

const TIKTOK_UA_PATTERNS = [
  /TikTokBot/i,
  /TikTokSpider/i,
  /ByteDance/i,
  /BytedanceWebview/i,
  /musical_ly/i,
];

const GOOGLE_UA_PATTERNS = [
  /Googlebot/i,
  /Google-InspectionTool/i,
  /AdsBot-Google/i,
  /GoogleAdwordsInApp/i,
  /Google-Adwords-Express/i,
  /GoogleOther/i,
  /google-site-verification/i,
];

// Known ad platform data center IP ranges
const AD_PLATFORM_DATA_CENTERS = [
  // Facebook/Meta data centers
  { range: [3870543872, 3870609407], platform: "Facebook" }, // 231.0.0.0/16 approximate
  { range: [1761607680, 1761673215], platform: "Facebook" },
  // Google data centers
  { range: [1108234240, 1108299775], platform: "Google" },
  { range: [1123696640, 1123762175], platform: "Google" },
  // TikTok/ByteDance
  { range: [2742288384, 2742353919], platform: "TikTok" },
];

function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function matchesIpPattern(ip: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(ip));
}

function matchesUA(ua: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(ua));
}

export function detectPlatformReviewer(
  ip: string,
  userAgent: string,
  referer: string
): PlatformCheckResult {
  const ua = userAgent || "";
  const ref = referer || "";

  // Check Facebook
  if (
    matchesUA(ua, FACEBOOK_UA_PATTERNS) ||
    matchesIpPattern(ip, FACEBOOK_IP_PATTERNS) ||
    ref.includes("facebook.com") ||
    ref.includes("l.facebook.com") ||
    ref.includes("fbclid=")
  ) {
    // If it's a bot/reviewer (not a real user from Facebook)
    if (matchesUA(ua, FACEBOOK_UA_PATTERNS)) {
      return {
        isReviewer: true,
        platform: "Facebook",
        reason: "Facebook crawler/reviewer detected via user-agent",
        action: "safe_page",
      };
    }
    if (matchesIpPattern(ip, FACEBOOK_IP_PATTERNS)) {
      return {
        isReviewer: true,
        platform: "Facebook",
        reason: "Facebook IP range detected",
        action: "safe_page",
      };
    }
  }

  // Check TikTok
  if (
    matchesUA(ua, TIKTOK_UA_PATTERNS) ||
    matchesIpPattern(ip, TIKTOK_IP_PATTERNS) ||
    ref.includes("tiktok.com")
  ) {
    if (matchesUA(ua, TIKTOK_UA_PATTERNS)) {
      return {
        isReviewer: true,
        platform: "TikTok",
        reason: "TikTok crawler/reviewer detected via user-agent",
        action: "safe_page",
      };
    }
    if (matchesIpPattern(ip, TIKTOK_IP_PATTERNS)) {
      return {
        isReviewer: true,
        platform: "TikTok",
        reason: "TikTok IP range detected",
        action: "safe_page",
      };
    }
  }

  // Check Google
  if (
    matchesUA(ua, GOOGLE_UA_PATTERNS) ||
    matchesIpPattern(ip, GOOGLE_IP_PATTERNS)
  ) {
    if (matchesUA(ua, GOOGLE_UA_PATTERNS)) {
      return {
        isReviewer: true,
        platform: "Google",
        reason: "Google crawler/AdsBot detected via user-agent",
        action: "safe_page",
      };
    }
    if (matchesIpPattern(ip, GOOGLE_IP_PATTERNS)) {
      return {
        isReviewer: true,
        platform: "Google",
        reason: "Google IP range detected",
        action: "safe_page",
      };
    }
  }

  // Check data center IPs
  const ipNum = ipToNumber(ip);
  for (const dc of AD_PLATFORM_DATA_CENTERS) {
    if (ipNum >= dc.range[0] && ipNum <= dc.range[1]) {
      return {
        isReviewer: true,
        platform: dc.platform,
        reason: `${dc.platform} data center IP detected`,
        action: "safe_page",
      };
    }
  }

  return {
    isReviewer: false,
    platform: "none",
    reason: "No ad platform reviewer detected",
    action: "allow",
  };
}

export function shouldShowSafePage(
  platformResult: PlatformCheckResult,
  link: {
    safePageUrl: string;
    blockFacebookReviewers: boolean;
    blockTikTokReviewers: boolean;
    blockGoogleReviewers: boolean;
  }
): boolean {
  if (!platformResult.isReviewer) return false;
  if (!link.safePageUrl) return false;

  if (platformResult.platform === "Facebook" && link.blockFacebookReviewers)
    return true;
  if (platformResult.platform === "TikTok" && link.blockTikTokReviewers)
    return true;
  if (platformResult.platform === "Google" && link.blockGoogleReviewers)
    return true;

  return false;
}

export function checkGeoAccess(
  country: string,
  allowedCountries: string[],
  blockedCountries: string[]
): { allowed: boolean; reason: string } {
  if (!country || country === "Unknown") {
    return { allowed: true, reason: "Unknown country, allowing" };
  }

  if (blockedCountries.length > 0 && blockedCountries.includes(country)) {
    return { allowed: false, reason: `Country ${country} is blocked` };
  }

  if (allowedCountries.length > 0 && !allowedCountries.includes(country)) {
    return { allowed: false, reason: `Country ${country} not in allowed list` };
  }

  return { allowed: true, reason: "Geo check passed" };
}
