import { NextRequest, NextResponse } from "next/server";
import { trackClick, getLink } from "@/lib/store";
import { detectBot } from "@/lib/bot-detect";
import { detectPlatformReviewer, shouldShowSafePage } from "@/lib/platform-detect";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, ...analytics } = body;

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const link = getLink(slug);
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

    // 2. Platform reviewer detection
    const platformResult = detectPlatformReviewer(
      ip,
      userAgent,
      analytics.referrer || refererHeader
    );

    let shouldBlock = false;
    let showSafePage = false;
    let blockReason = "";

    // Bot blocking
    const botMode = (link as unknown as Record<string, unknown>).trafficBotMode as string || "block";
    if (botMode === "block" && botResult.isBot) {
      shouldBlock = true;
      blockReason = botResult.reasons.join(", ") || "Bot detected";
    }

    // Platform reviewer -> safe page
    const safePageUrl = (link as unknown as Record<string, unknown>).safePageUrl as string || "";
    const blockFb = (link as unknown as Record<string, unknown>).blockFacebookReviewers as boolean ?? true;
    const blockTt = (link as unknown as Record<string, unknown>).blockTikTokReviewers as boolean ?? true;
    const blockGg = (link as unknown as Record<string, unknown>).blockGoogleReviewers as boolean ?? true;

    if (
      safePageUrl &&
      shouldShowSafePage(platformResult, {
        safePageUrl,
        blockFacebookReviewers: blockFb,
        blockTikTokReviewers: blockTt,
        blockGoogleReviewers: blockGg,
      })
    ) {
      showSafePage = true;
    }

    // Referrer blocking
    const trafficFilter = (link as unknown as Record<string, unknown>).trafficFilter as Record<string, unknown> | undefined;
    if (trafficFilter) {
      const blockedRefs = (trafficFilter.blockedReferrers as string[]) || [];
      const blockedUAs = (trafficFilter.blockedUserAgents as string[]) || [];

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

      if (blockedUAs.length > 0) {
        for (const blocked of blockedUAs) {
          if (userAgent.toLowerCase().includes(blocked.toLowerCase())) {
            shouldBlock = true;
            blockReason = `User agent blocked: ${blocked}`;
            break;
          }
        }
      }
    }

    const verdict = shouldBlock
      ? "block"
      : showSafePage
        ? "allow"
        : botResult.verdict;

    // Track click
    trackClick(slug, {
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

    // Response
    if (shouldBlock) {
      return NextResponse.json({
        success: true,
        blocked: true,
        reason: blockReason || "Blocked",
      });
    }

    if (showSafePage && safePageUrl) {
      return NextResponse.json({
        success: true,
        redirect: safePageUrl,
        isSafePage: true,
        platform: platformResult.platform,
      });
    }

    // Real user -> money page or destination
    const moneyPageUrl = (link as unknown as Record<string, unknown>).moneyPageUrl as string || "";
    const destination = moneyPageUrl || link.destinationUrl;

    return NextResponse.json({
      success: true,
      redirect: destination,
      isMoneyPage: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 }
    );
  }
}
