import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

interface UploadedProject {
  id: string;
  name: string;
  files: Record<string, string>;
  originalSize: number;
  processedSize: number;
  createdAt: string;
  scriptHead: string;
  scriptBodyStart: string;
  scriptBodyEnd: string;
}

const projects = new Map<string, UploadedProject>();

export async function GET() {
  try {
    const all = Array.from(projects.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json({ projects: all });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const scriptHead = (formData.get("scriptHead") as string) || "";
    const scriptBodyStart = (formData.get("scriptBodyStart") as string) || "";
    const scriptBodyEnd = (formData.get("scriptBodyEnd") as string) || "";

    if (!file) {
      return NextResponse.json(
        { error: "ZIP file is required" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "Only ZIP files are supported" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);

    const files: Record<string, string> = {};
    let originalSize = 0;
    let processedSize = 0;

    const fileEntries: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;

      fileEntries.push(
        zipEntry.async("string").then((content) => {
          originalSize += Buffer.byteLength(content, "utf-8");
          let processed = content;

          if (
            relativePath.endsWith(".html") ||
            relativePath.endsWith(".htm")
          ) {
            if (scriptHead) {
              processed = processed.replace(
                /(<head[^>]*>)/i,
                `$1\n${scriptHead}`
              );
            }

            if (scriptBodyStart) {
              processed = processed.replace(
                /(<body[^>]*>)/i,
                `$1\n${scriptBodyStart}`
              );
            }

            if (scriptBodyEnd) {
              processed = processed.replace(
                /(<\/body>)/i,
                `${scriptBodyEnd}\n$1`
              );
            }
          }

          files[relativePath] = processed;
          processedSize += Buffer.byteLength(processed, "utf-8");
        })
      );
    });

    await Promise.all(fileEntries);

    const project: UploadedProject = {
      id: crypto.randomUUID(),
      name: file.name.replace(".zip", ""),
      files,
      originalSize,
      processedSize,
      createdAt: new Date().toISOString(),
      scriptHead,
      scriptBodyStart,
      scriptBodyEnd,
    };

    projects.set(project.id, project);

    const outputZip = new JSZip();
    for (const [path, content] of Object.entries(files)) {
      outputZip.file(path, content);
    }
    const outputArray = await outputZip.generateAsync({ type: "arraybuffer" });

    return new NextResponse(outputArray, {
      status: 201,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${project.name}-processed.zip"`,
        "X-Project-Id": project.id,
        "X-File-Count": String(Object.keys(files).length),
        "X-Original-Size": String(originalSize),
        "X-Processed-Size": String(processedSize),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process ZIP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const deleted = projects.delete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
