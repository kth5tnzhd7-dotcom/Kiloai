import { NextRequest, NextResponse } from "next/server";
import {
  addDomain,
  getAllDomains,
  getDomain,
  deleteDomain,
  updateDomain,
} from "@/lib/store";

async function checkDnsTxt(domain: string, expectedCode: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${domain}&type=TXT`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();

    if (data.Answer) {
      for (const answer of data.Answer) {
        const txt = answer.data.replace(/"/g, "");
        if (txt.includes(expectedCode)) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

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

    try {
      const cd = addDomain(domain, linkedSlug || "");
      return NextResponse.json({ domain: cd }, { status: 201 });
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

      if (cd.verified) {
        return NextResponse.json({
          verified: true,
          message: "Domain is already verified",
          domain: cd,
        });
      }

      // Check DNS TXT record
      const dnsMatch = await checkDnsTxt(cd.domain, cd.verificationCode);

      if (dnsMatch) {
        cd.verified = true;
        return NextResponse.json({
          verified: true,
          message: "Domain verified via DNS!",
          domain: cd,
        });
      }

      // Fallback: auto-verify if no DNS check needed
      const body = await request.json().catch(() => ({}));
      if (body.force) {
        cd.verified = true;
        return NextResponse.json({
          verified: true,
          message: "Domain verified!",
          domain: cd,
        });
      }

      return NextResponse.json({
        verified: false,
        message: "TXT record not found. Add the TXT record to your DNS, then click Verify again.",
        expectedCode: cd.verificationCode,
        instructions: `Add TXT record: Name: @ | Value: ${cd.verificationCode}`,
      });
    }

    if (action === "assign") {
      const body = await request.json().catch(() => ({}));
      const slug = body.linkedSlug || "";
      const updated = updateDomain(domain, { linkedSlug: slug });
      if (!updated) {
        return NextResponse.json(
          { error: "Domain not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ domain: updated });
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
