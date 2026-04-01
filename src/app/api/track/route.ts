import { NextRequest, NextResponse } from "next/server";
import { trackClick, getLink } from "@/lib/db-store";
import { detectBot } from "@/lib/bot-detect";
import { detectPlatformReviewer, shouldShowSafePage, checkGeoAccess } from "@/lib/platform-detect";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, ...analytics } = body;

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const link = await getLink(slug);
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (!link.isActive) {
      return NextResponse.json({ error: "Link is inactive" }, { status: 403 });
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "Unknown";
    const userAgent = request.headers.get("user-agent") || "";
    const refererHeader = request.headers.get("referer") || "";

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // 1. Bot detection
    const botResult = detectBot(userAgent, headers, analytics.referrer || refererHeader);

    // 2. Platform reviewer detection (Facebook, TikTok, Google)
    const platformResult = detectPlatformReviewer(
      ip,
      userAgent,
      analytics.referrer || refererHeader
    );

    // 3. Geo filtering
    const geoAllowed = link.geoAllowedCountries
      ? JSON.parse(link.geoAllowedCountries as string)
      : [];
    const geoBlocked = link.geoBlockedCountries
      ? JSON.parse(link.geoBlockedCountries as string)
      : [];
    const geoResult = checkGeoAccess(
      analytics.country || "Unknown",
      geoAllowed,
      geoBlocked
    );

    // 4. Referrer blocking
    const blockedRefs = link.trafficBlockedReferrers
      ? JSON.parse(link.trafficBlockedReferrers as string)
      : [];
    const allowedRefs = link.trafficAllowedReferrers
      ? JSON.parse(link.trafficAllowedReferrers as string)
      : [];
    const blockedUAs = link.trafficBlockedUserAgents
      ? JSON.parse(link.trafficBlockedUserAgents as string)
      : [];

    let shouldBlock = false;
    let showSafePage = false;
    let blockReason = "";

    // Check bot blocking
    if (link.trafficBotMode === "block" && botResult.isBot) {
      shouldBlock = true;
      blockReason = botResult.reasons.join(", ") || "Bot detected";
    }

    // Check platform reviewer -> safe page
    if (
      shouldShowSafePage(platformResult, {
        safePageUrl: link.safePageUrl || "",
        blockFacebookReviewers: link.blockFacebookReviewers ?? true,
        blockTikTokReviewers: link.blockTikTokReviewers ?? true,
        blockGoogleReviewers: link.blockGoogleReviewers ?? true,
      })
    ) {
      showSafePage = true;
    }

    // Check geo blocking
    if (!geoResult.allowed) {
      shouldBlock = true;
      blockReason = geoResult.reason;
    }

    // Check referrer blocking
    if (blockedRefs.length > 0) {
      const ref = (analytics.referrer || refererHeader || "").toLowerCase();
      for (const blocked of blockedRefs) {
        if (ref.includes(blocked.toLowerCase())) {
          shouldBlock = true;
          blockReason = `Referrer blocked: ${blocked}`;
          break;
        }
      }
    }

    // Check allowed referrers
    if (allowedRefs.length > 0) {
      const ref = (analytics.referrer || refererHeader || "").toLowerCase();
      const isAllowed = allowedRefs.some((a: string) =>
        ref.includes(a.toLowerCase())
      );
      if (!isAllowed && ref) {
        shouldBlock = true;
        blockReason = "Referrer not in allowed list";
      }
    }

    // Check blocked user agents
    if (blockedUAs.length > 0) {
      for (const blocked of blockedUAs) {
        if (userAgent.toLowerCase().includes(blocked.toLowerCase())) {
          shouldBlock = true;
          blockReason = `User agent blocked: ${blocked}`;
          break;
        }
      }
    }

    const verdict = shouldBlock
      ? "block"
      : showSafePage
        ? "safe_page"
        : botResult.verdict;

    // Track the click
    await trackClick(slug, {
      device: analytics.device || "unknown",
      browser: analytics.browser || "Unknown",
      browserVersion: analytics.browserVersion || "",
      os: analytics.os || "Unknown",
      osVersion: analytics.osVersion || "",
      referrer: analytics.referrer || refererHeader || "Direct",
      language: analytics.language || "Unknown",
      screenWidth: analytics.screenWidth || 0,
      screenHeight: analytics.screenHeight || 0,
      timezone: analytics.timezone || "Unknown",
      ip,
      country: analytics.country || "Unknown",
      isBot: botResult.isBot || platformResult.isReviewer,
      botType: platformResult.isReviewer
        ? `${platformResult.platform} Reviewer`
        : botResult.botType,
      verdict,
    });

    // Response logic
    if (shouldBlock) {
      return NextResponse.json({
        success: true,
        blocked: true,
        reason: blockReason || "Blocked by traffic filter",
      });
    }

    // Platform reviewer -> show safe page
    if (showSafePage && link.safePageUrl) {
      return NextResponse.json({
        success: true,
        redirect: link.safePageUrl,
        isSafePage: true,
        platform: platformResult.platform,
      });
    }

    // Suspicious traffic -> redirect to safe URL
    if (
      botResult.verdict === "suspicious" &&
      link.trafficBotMode === "redirect" &&
      link.trafficBotRedirectUrl
    ) {
      return NextResponse.json({
        success: true,
        redirect: link.trafficBotRedirectUrl,
      });
    }

    // Real user -> money page or destination
    const destinationUrl = link.moneyPageUrl || link.destinationUrl;
    return NextResponse.json({
      success: true,
      redirect: destinationUrl,
      isMoneyPage: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 }
    );
  }
}
