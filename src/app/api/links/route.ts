import { NextRequest, NextResponse } from "next/server";
import {
  createLink,
  getAllLinks,
  getLink,
  getAnalytics,
  deleteLink,
  toggleLink,
  updateLink,
} from "@/lib/store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const analytics = searchParams.get("analytics");

    if (slug && analytics === "true") {
      const data = getAnalytics(slug);
      if (!data) {
        return NextResponse.json(
          { error: "Link not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ analytics: data });
    }

    if (slug) {
      const link = getLink(slug);
      if (!link) {
        return NextResponse.json(
          { error: "Link not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ link });
    }

    const links = getAllLinks();
    return NextResponse.json({ links });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      destinationUrl,
      slug,
      whitePageTitle,
      whitePageDescription,
      customDomain,
      password,
      expiryDate,
      maxClicks,
      redirectDelay,
      cloakType,
    } = body;

    if (!destinationUrl) {
      return NextResponse.json(
        { error: "Destination URL is required" },
        { status: 400 }
      );
    }

    try {
      new URL(destinationUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid destination URL" },
        { status: 400 }
      );
    }

    const link = createLink({
      destinationUrl,
      slug: slug || undefined,
      whitePageTitle: whitePageTitle || "Welcome",
      whitePageDescription: whitePageDescription || "Loading...",
      customDomain: customDomain || "",
      password: password || undefined,
      expiryDate: expiryDate || undefined,
      maxClicks: maxClicks || undefined,
      redirectDelay: redirectDelay ?? undefined,
      cloakType: cloakType || undefined,
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const action = searchParams.get("action");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    if (action === "toggle") {
      const link = toggleLink(slug);
      if (!link) {
        return NextResponse.json(
          { error: "Link not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ link });
    }

    const body = await request.json();
    const link = updateLink(slug, body);
    if (!link) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ link });
  } catch {
    return NextResponse.json(
      { error: "Failed to update link" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    const deleted = deleteLink(slug);
    if (!deleted) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete link" },
      { status: 500 }
    );
  }
}
