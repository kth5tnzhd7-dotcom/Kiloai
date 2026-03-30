import { NextRequest, NextResponse } from "next/server";
import {
  getDeployments,
  createDeployment,
  updateDeployment,
  deleteDeployment,
} from "@/lib/db-store";

async function uploadToCpanel(
  cpanelUrl: string,
  username: string,
  token: string,
  targetDir: string,
  files: Record<string, string | Buffer>
): Promise<{ success: boolean; message: string; url: string }> {
  const baseUrl = cpanelUrl.replace(/\/$/, "");

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = `${targetDir}/${filePath}`;
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));

    try {
      await fetch(
        `${baseUrl}/execute/Fileman/mkdirs?dir=${encodeURIComponent(dir)}`,
        {
          method: "GET",
          headers: {
            Authorization: `cpanel ${username}:${token}`,
          },
        }
      );
    } catch {
      // Directory might already exist
    }

    try {
      const formData = new FormData();
      const uint8 =
        typeof content === "string"
          ? new TextEncoder().encode(content)
          : new Uint8Array(content);
      const blob = new Blob([uint8], {
        type: typeof content === "string" ? "text/plain" : "application/octet-stream",
      });
      formData.append("file-1", blob, filePath.split("/").pop() || "file");
      formData.append("dir", dir);

      await fetch(`${baseUrl}/execute/Fileman/upload_files`, {
        method: "POST",
        headers: {
          Authorization: `cpanel ${username}:${token}`,
        },
        body: formData,
      });
    } catch {
      // Continue with other files
    }
  }

  const protocol = baseUrl.startsWith("https") ? "https" : "http";
  const host = baseUrl.replace(/^https?:\/\//, "").split("/")[0];
  const tempUrl = `${protocol}://${host}/${targetDir.replace(/^public_html\/?/, "")}`;

  return { success: true, message: "Files deployed", url: tempUrl };
}

export async function GET() {
  try {
    const all = await getDeployments();
    return NextResponse.json({ deployments: all });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch deployments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const cpanelUrl = (formData.get("cpanelUrl") as string) || "";
      const cpanelUsername = (formData.get("cpanelUsername") as string) || "";
      const cpanelToken = (formData.get("cpanelToken") as string) || "";
      const cpanelDir = (formData.get("cpanelDir") as string) || "public_html";
      const name = (formData.get("name") as string) || "deploy";

      if (!file) {
        return NextResponse.json(
          { error: "ZIP file is required" },
          { status: 400 }
        );
      }

      if (!cpanelUrl || !cpanelUsername || !cpanelToken) {
        return NextResponse.json(
          { error: "cPanel credentials are required (URL, username, API token)" },
          { status: 400 }
        );
      }

      const JSZip = (await import("jszip")).default;
      const buffer = Buffer.from(await file.arrayBuffer());
      const zip = await JSZip.loadAsync(buffer);

      const files: Record<string, Buffer> = {};
      let fileCount = 0;

      const entries: Promise<void>[] = [];
      zip.forEach((path, entry) => {
        if (entry.dir) return;
        fileCount++;
        entries.push(
          entry.async("nodebuffer").then((data) => {
            files[path] = data;
          })
        );
      });
      await Promise.all(entries);

      const slug = crypto.randomUUID().slice(0, 8);
      const deployDir = `${cpanelDir}/${slug}`;

      const deployId = await createDeployment({
        name,
        fileCount,
        totalSize: buffer.length,
        cpanelUrl,
        cpanelUsername,
        cpanelToken,
        cpanelDir: deployDir,
      });

      const result = await uploadToCpanel(
        cpanelUrl,
        cpanelUsername,
        cpanelToken,
        deployDir,
        files
      );

      const tempUrl = result.url || `https://${cpanelUrl.replace(/^https?:\/\//, "").split("/")[0]}/${slug}`;

      await updateDeployment(deployId, {
        deployUrl: tempUrl,
        status: result.success ? "deployed" : "failed",
      });

      return NextResponse.json(
        {
          deployment: {
            id: deployId,
            name,
            fileCount,
            deployUrl: tempUrl,
            status: result.success ? "deployed" : "failed",
          },
        },
        { status: 201 }
      );
    }

    const body = await request.json();
    const { name, deployUrl } = body;

    const deployId = await createDeployment({
      name: name || "manual",
      fileCount: 0,
      totalSize: 0,
    });

    if (deployUrl) {
      await updateDeployment(deployId, {
        deployUrl,
        status: "deployed",
      });
    }

    return NextResponse.json(
      {
        deployment: {
          id: deployId,
          deployUrl: deployUrl || "",
          status: deployUrl ? "deployed" : "pending",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to deploy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Deployment ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updated = await updateDeployment(id, body);

    if (!updated) {
      return NextResponse.json(
        { error: "Deployment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ deployment: updated });
  } catch {
    return NextResponse.json(
      { error: "Failed to update deployment" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Deployment ID is required" },
        { status: 400 }
      );
    }

    await deleteDeployment(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete deployment" },
      { status: 500 }
    );
  }
}
