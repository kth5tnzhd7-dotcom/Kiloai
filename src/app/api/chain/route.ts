import { NextRequest, NextResponse } from "next/server";

interface ChainStep {
  domain: string;
  delay: number;
}

interface Chain {
  id: string;
  destinationUrl: string;
  steps: ChainStep[];
  whitePageTitle: string;
  whitePageDescription: string;
  botMode: "block" | "redirect";
  isActive: boolean;
  clicks: number;
  realClicks: number;
  botClicks: number;
  createdAt: string;
}

interface ChainSession {
  chainId: string;
  currentStep: number;
  userAgent: string;
  startTime: number;
  isBot: boolean;
}

const chains = new Map<string, Chain>();
const sessions = new Map<string, ChainSession>();

const DEFAULT_DOMAINS = [
  "verify.secure-gateway.com",
  "check.safe-redirect.net",
  "auth.trusted-link.org",
  "go.fast-forward.io",
];

function isBotUserAgent(ua: string): boolean {
  if (!ua) return true;
  const botPatterns = [
    /bot|crawl|spider|scrape|fetch/i,
    /curl|wget|python|go-http|java/i,
    /headless|phantom|selenium|puppeteer/i,
    /googlebot|bingbot|facebookbot|twitterbot/i,
    /semrush|ahrefs|mj12bot|dotbot/i,
    /gptbot|chatgpt|claudebot|anthropic/i,
  ];
  for (const p of botPatterns) {
    if (p.test(ua)) return true;
  }
  if (ua.length < 20) return true;
  return false;
}

function generateChainUrl(chainId: string, step: number, token: string): string {
  return `/c/${chainId}/${step}/${token}`;
}

export async function GET() {
  try {
    const all = Array.from(chains.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json({ chains: all });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch chains" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      destinationUrl,
      steps,
      whitePageTitle,
      whitePageDescription,
      botMode,
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

    const chainSteps: ChainStep[] = (
      steps || DEFAULT_DOMAINS.slice(0, 4)
    ).map((d: string | ChainStep) => {
      if (typeof d === "string") {
        return { domain: d, delay: 1500 };
      }
      return { domain: d.domain, delay: d.delay || 1500 };
    });

    const chain: Chain = {
      id: crypto.randomUUID().slice(0, 8),
      destinationUrl,
      steps: chainSteps,
      whitePageTitle: whitePageTitle || "Verifying...",
      whitePageDescription: whitePageDescription || "Please wait while we verify your access.",
      botMode: botMode || "block",
      isActive: true,
      clicks: 0,
      realClicks: 0,
      botClicks: 0,
      createdAt: new Date().toISOString(),
    };

    chains.set(chain.id, chain);

    return NextResponse.json({ chain }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create chain";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action");

    if (!id) {
      return NextResponse.json({ error: "Chain ID required" }, { status: 400 });
    }

    const chain = chains.get(id);
    if (!chain) {
      return NextResponse.json({ error: "Chain not found" }, { status: 404 });
    }

    if (action === "toggle") {
      chain.isActive = !chain.isActive;
      return NextResponse.json({ chain });
    }

    if (action === "start") {
      const ua = request.headers.get("user-agent") || "";
      const isBot = isBotUserAgent(ua);

      chain.clicks++;

      if (isBot) {
        chain.botClicks++;
        if (chain.botMode === "block") {
          return NextResponse.json({
            blocked: true,
            reason: "Bot detected",
          });
        }
      }

      chain.realClicks++;
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const sessionId = crypto.randomUUID().slice(0, 8);

      sessions.set(sessionId, {
        chainId: id,
        currentStep: 0,
        userAgent: ua,
        startTime: Date.now(),
        isBot,
      });

      const nextUrl = generateChainUrl(id, 0, token);

      return NextResponse.json({
        redirect: nextUrl,
        token,
        sessionId,
        step: 0,
        totalSteps: chain.steps.length,
      });
    }

    const body = await request.json();
    if (body.destinationUrl !== undefined)
      chain.destinationUrl = body.destinationUrl;
    if (body.isActive !== undefined) chain.isActive = body.isActive;

    return NextResponse.json({ chain });
  } catch {
    return NextResponse.json(
      { error: "Failed to update chain" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Chain ID required" }, { status: 400 });
    }

    chains.delete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete chain" },
      { status: 500 }
    );
  }
}

export { chains, sessions };
