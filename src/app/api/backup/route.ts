import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { links, clickEvents, domains, deployments } from "@/db/schema";

export async function GET() {
  try {
    const allLinks = await db.select().from(links);
    const allEvents = await db.select().from(clickEvents);
    const allDomains = await db.select().from(domains);
    const allDeployments = await db.select().from(deployments);

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      links: allLinks,
      clickEvents: allEvents,
      domains: allDomains,
      deployments: allDeployments,
    };

    const json = JSON.stringify(backup, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { links: backupLinks, clickEvents: backupEvents, domains: backupDomains, deployments: backupDeployments } = body;

    if (!backupLinks && !backupDomains) {
      return NextResponse.json(
        { error: "Invalid backup file" },
        { status: 400 }
      );
    }

    let imported = { links: 0, events: 0, domains: 0, deployments: 0 };

    if (backupLinks && Array.isArray(backupLinks)) {
      for (const link of backupLinks) {
        try {
          await db.insert(links).values({
            id: link.id || crypto.randomUUID(),
            slug: link.slug,
            destinationUrl: link.destinationUrl,
            whitePageTitle: link.whitePageTitle || "Welcome",
            whitePageDescription: link.whitePageDescription || "Loading...",
            customDomain: link.customDomain || "",
            password: link.password || "",
            expiryDate: link.expiryDate || "",
            isActive: link.isActive ?? true,
            maxClicks: link.maxClicks || 0,
            redirectDelay: link.redirectDelay || 3,
            cloakType: link.cloakType || "redirect",
            trafficBotMode: link.trafficBotMode || "block",
            trafficBotRedirectUrl: link.trafficBotRedirectUrl || "",
            trafficBlockedReferrers: link.trafficBlockedReferrers || "[]",
            trafficAllowedReferrers: link.trafficAllowedReferrers || "[]",
            trafficBlockedUserAgents: link.trafficBlockedUserAgents || "[]",
            trafficAllowedUserAgents: link.trafficAllowedUserAgents || "[]",
            nicegramAdUrl: link.nicegramAdUrl || "",
            clicks: link.clicks || 0,
            createdAt: link.createdAt || new Date().toISOString(),
          }).onConflictDoNothing();
          imported.links++;
        } catch {
          // skip duplicates
        }
      }
    }

    if (backupEvents && Array.isArray(backupEvents)) {
      for (const event of backupEvents) {
        try {
          await db.insert(clickEvents).values({
            id: event.id || crypto.randomUUID(),
            linkSlug: event.linkSlug,
            timestamp: event.timestamp,
            device: event.device || "unknown",
            browser: event.browser || "Unknown",
            browserVersion: event.browserVersion || "",
            os: event.os || "Unknown",
            osVersion: event.osVersion || "",
            referrer: event.referrer || "Direct",
            language: event.language || "Unknown",
            screenWidth: event.screenWidth || 0,
            screenHeight: event.screenHeight || 0,
            timezone: event.timezone || "Unknown",
            ip: event.ip || "Unknown",
            country: event.country || "Unknown",
            isBot: event.isBot ?? false,
            botType: event.botType || "Unknown",
            verdict: event.verdict || "allow",
          }).onConflictDoNothing();
          imported.events++;
        } catch {
          // skip
        }
      }
    }

    if (backupDomains && Array.isArray(backupDomains)) {
      for (const domain of backupDomains) {
        try {
          await db.insert(domains).values({
            id: domain.id || crypto.randomUUID(),
            domain: domain.domain,
            verified: domain.verified ?? false,
            verificationCode: domain.verificationCode || "",
            linkedSlug: domain.linkedSlug || "",
            sslEnabled: domain.sslEnabled ?? true,
            createdAt: domain.createdAt || new Date().toISOString(),
          }).onConflictDoNothing();
          imported.domains++;
        } catch {
          // skip
        }
      }
    }

    if (backupDeployments && Array.isArray(backupDeployments)) {
      for (const dep of backupDeployments) {
        try {
          await db.insert(deployments).values({
            id: dep.id || crypto.randomUUID(),
            name: dep.name || "unknown",
            fileCount: dep.fileCount || 0,
            totalSize: dep.totalSize || 0,
            deployUrl: dep.deployUrl || "",
            cpanelUrl: dep.cpanelUrl || "",
            cpanelUsername: dep.cpanelUsername || "",
            cpanelToken: dep.cpanelToken || "",
            cpanelDir: dep.cpanelDir || "public_html",
            status: dep.status || "pending",
            linkedSlug: dep.linkedSlug || "",
            createdAt: dep.createdAt || new Date().toISOString(),
          }).onConflictDoNothing();
          imported.deployments++;
        } catch {
          // skip
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      message: `Restored: ${imported.links} links, ${imported.events} events, ${imported.domains} domains, ${imported.deployments} deployments`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
