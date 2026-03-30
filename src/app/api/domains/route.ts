import { NextRequest, NextResponse } from "next/server";
import {
  addDomain,
  getAllDomains,
  getDomain,
  verifyDomain,
  deleteDomain,
  getVerificationCode,
} from "@/lib/store";

export async function GET() {
  try {
    const domains = getAllDomains();
    return NextResponse.json({ domains });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch domains" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, linkedSlug } = body;

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    if (!linkedSlug) {
      return NextResponse.json(
        { error: "Linked slug is required" },
        { status: 400 }
      );
    }

    try {
      const cd = addDomain(domain, linkedSlug);
      const verificationCode = getVerificationCode(cd.domain);
      return NextResponse.json(
        { domain: cd, verificationCode },
        { status: 201 }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add domain";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to add domain" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const action = searchParams.get("action");

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    if (action === "verify") {
      const cd = getDomain(domain);
      if (!cd) {
        return NextResponse.json(
          { error: "Domain not found" },
          { status: 404 }
        );
      }
      const expectedCode = getVerificationCode(cd.domain);
      const txtRecord = request.headers.get("x-verification-check") || "";

      if (txtRecord.includes(expectedCode)) {
        verifyDomain(domain);
        return NextResponse.json({ verified: true, domain: getDomain(domain) });
      }

      return NextResponse.json({
        verified: false,
        expectedCode,
        message: `Add a TXT record: cloak-verify=${expectedCode}`,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Failed to update domain" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    const deleted = deleteDomain(domain);
    if (!deleted) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete domain" },
      { status: 500 }
    );
  }
}
