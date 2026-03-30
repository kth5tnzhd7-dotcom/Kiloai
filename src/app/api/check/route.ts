import { NextRequest, NextResponse } from "next/server";
import { detectBot } from "@/lib/bot-detect";
import { getLink } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, userAgent, referrer } = body;

    const ua = userAgent || request.headers.get("user-agent") || "";
    const ref = referrer || request.headers.get("referer") || "";

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const result = detectBot(ua, headers, ref);

    let trafficFilter = null;
    if (slug) {
      const link = getLink(slug);
      if (link) {
        trafficFilter = link.trafficFilter;

        let shouldBlock = false;

        if (trafficFilter.botMode === "block" && result.isBot) {
          shouldBlock = true;
        }

        if (trafficFilter.blockedUserAgents.length > 0) {
          for (const blocked of trafficFilter.blockedUserAgents) {
            if (ua.toLowerCase().includes(blocked.toLowerCase())) {
              shouldBlock = true;
              break;
            }
          }
        }

        if (trafficFilter.blockedReferrers.length > 0) {
          for (const blocked of trafficFilter.blockedReferrers) {
            if (ref.toLowerCase().includes(blocked.toLowerCase())) {
              shouldBlock = true;
              break;
            }
          }
        }

        return NextResponse.json({
          ...result,
          shouldBlock,
          trafficFilter,
          action: shouldBlock
            ? trafficFilter.botMode === "redirect" && trafficFilter.botRedirectUrl
              ? "redirect"
              : "block"
            : "allow",
          redirectUrl: trafficFilter.botRedirectUrl || null,
        });
      }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to check" },
      { status: 500 }
    );
  }
}
