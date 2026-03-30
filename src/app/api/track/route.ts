import { NextRequest, NextResponse } from "next/server";
import { trackClick, getLink } from "@/lib/store";
import { detectBot } from "@/lib/bot-detect";

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

    const botResult = detectBot(userAgent, headers, analytics.referrer || refererHeader);

    let shouldBlock = false;
    if (link.trafficFilter.botMode === "block" && botResult.isBot) {
      shouldBlock = true;
    }

    if (link.trafficFilter.blockedReferrers.length > 0) {
      const ref = (analytics.referrer || refererHeader || "").toLowerCase();
      for (const blocked of link.trafficFilter.blockedReferrers) {
        if (ref.includes(blocked.toLowerCase())) {
          shouldBlock = true;
          break;
        }
      }
    }

    if (link.trafficFilter.blockedUserAgents.length > 0) {
      for (const blocked of link.trafficFilter.blockedUserAgents) {
        if (userAgent.toLowerCase().includes(blocked.toLowerCase())) {
          shouldBlock = true;
          break;
        }
      }
    }

    if (link.trafficFilter.allowedReferrers.length > 0) {
      const ref = (analytics.referrer || refererHeader || "").toLowerCase();
      const isAllowed = link.trafficFilter.allowedReferrers.some((a) =>
        ref.includes(a.toLowerCase())
      );
      if (!isAllowed && ref) {
        shouldBlock = true;
      }
    }

    const verdict = shouldBlock ? "block" : botResult.verdict;

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
      isBot: botResult.isBot,
      botType: botResult.botType,
      verdict,
    });

    if (shouldBlock) {
      return NextResponse.json({
        success: true,
        blocked: true,
        reason: botResult.reasons.join(", ") || "Blocked by traffic filter",
      });
    }

    if (
      botResult.verdict === "suspicious" &&
      link.trafficFilter.botMode === "redirect" &&
      link.trafficFilter.botRedirectUrl
    ) {
      return NextResponse.json({
        success: true,
        redirect: link.trafficFilter.botRedirectUrl,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 }
    );
  }
}
