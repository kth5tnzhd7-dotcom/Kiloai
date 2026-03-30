import { NextRequest, NextResponse } from "next/server";
import { trackClick, getLink } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, ...analytics } = body;

    if (!slug) {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    const link = getLink(slug);
    if (!link) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    if (!link.isActive) {
      return NextResponse.json(
        { error: "Link is inactive" },
        { status: 403 }
      );
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "Unknown";

    trackClick(slug, {
      device: analytics.device || "unknown",
      browser: analytics.browser || "Unknown",
      browserVersion: analytics.browserVersion || "",
      os: analytics.os || "Unknown",
      osVersion: analytics.osVersion || "",
      referrer: analytics.referrer || "Direct",
      language: analytics.language || "Unknown",
      screenWidth: analytics.screenWidth || 0,
      screenHeight: analytics.screenHeight || 0,
      timezone: analytics.timezone || "Unknown",
      ip,
      country: analytics.country || "Unknown",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 }
    );
  }
}
