import { NextRequest, NextResponse } from "next/server";

interface SavedScript {
  id: string;
  name: string;
  injectHead: string;
  injectBodyStart: string;
  injectBodyEnd: string;
  createdAt: string;
}

const scripts = new Map<string, SavedScript>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const script = scripts.get(id);
      if (!script) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ script });
    }

    const all = Array.from(scripts.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json({ scripts: all });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch scripts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, injectHead, injectBodyStart, injectBodyEnd } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const script: SavedScript = {
      id: crypto.randomUUID(),
      name,
      injectHead: injectHead || "",
      injectBodyStart: injectBodyStart || "",
      injectBodyEnd: injectBodyEnd || "",
      createdAt: new Date().toISOString(),
    };

    scripts.set(script.id, script);
    return NextResponse.json({ script }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    scripts.delete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
