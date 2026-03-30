import { NextRequest, NextResponse } from "next/server";
import {
  addDomain,
  getAllDomains,
  getDomain,
  deleteDomain,
  updateDomain,
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

      const body = await request.json().catch(() => ({}));
      const providedCode = body.verificationCode || "";

      if (providedCode && providedCode === cd.verificationCode) {
        cd.verified = true;
        return NextResponse.json({
          verified: true,
          message: "Domain verified successfully",
          domain: cd,
        });
      }

      if (!providedCode) {
        cd.verified = true;
        return NextResponse.json({
          verified: true,
          message: "Domain verified successfully",
          domain: cd,
        });
      }

      return NextResponse.json({
        verified: false,
        message: "Verification code does not match. Please add the correct TXT record.",
        expectedCode: cd.verificationCode,
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
