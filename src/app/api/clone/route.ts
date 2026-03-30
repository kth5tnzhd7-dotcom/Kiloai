import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

interface ClonedFile {
  path: string;
  size: number;
  type: string;
}

interface CloneResult {
  id: string;
  url: string;
  domain: string;
  files: ClonedFile[];
  totalSize: number;
  createdAt: string;
}

const cloneHistory = new Map<string, CloneResult>();

function normalizeUrl(input: string): URL {
  let urlStr = input.trim();
  if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
    urlStr = "https://" + urlStr;
  }
  return new URL(urlStr);
}

function getContentType(response: Response): string {
  return (
    response.headers.get("content-type")?.split(";")[0]?.trim() || ""
  );
}

function getExtensionFromContentType(ct: string): string {
  const map: Record<string, string> = {
    "text/html": ".html",
    "text/css": ".css",
    "text/javascript": ".js",
    "application/javascript": ".js",
    "application/json": ".json",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
    "image/x-icon": ".ico",
    "image/vnd.microsoft.icon": ".ico",
    "font/woff": ".woff",
    "font/woff2": ".woff2",
    "font/ttf": ".ttf",
    "font/otf": ".otf",
    "application/font-woff": ".woff",
    "application/font-woff2": ".woff2",
    "application/xml": ".xml",
    "text/xml": ".xml",
    "application/pdf": ".pdf",
    "video/mp4": ".mp4",
    "audio/mpeg": ".mp3",
  };
  return map[ct] || "";
}

function getExtensionFromUrl(url: string): string {
  const pathname = new URL(url).pathname;
  const last = pathname.split("/").pop() || "";
  const dotIdx = last.lastIndexOf(".");
  if (dotIdx > 0) return last.slice(dotIdx);
  return "";
}

function guessFilePath(
  url: string,
  contentType: string,
  isBase: boolean
): string {
  const parsed = new URL(url);
  let pathname = parsed.pathname;

  if (pathname === "/" || pathname === "") {
    return "index.html";
  }

  if (pathname.endsWith("/")) {
    return pathname.slice(1) + "index.html";
  }

  const ext = getExtensionFromUrl(url);
  if (!ext) {
    const ctExt = getExtensionFromContentType(contentType);
    if (ctExt) {
      return pathname.slice(1) + ctExt;
    }
  }

  return pathname.startsWith("/") ? pathname.slice(1) : pathname;
}

function extractUrls(html: string, baseUrl: string): Set<string> {
  const urls = new Set<string>();
  const base = new URL(baseUrl);

  const patterns = [
    /href\s*=\s*["']([^"']+)["']/gi,
    /src\s*=\s*["']([^"']+)["']/gi,
    /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi,
    /content\s*=\s*["'][^"']*url=([^"';\s]+)["']/gi,
    /srcset\s*=\s*["']([^"']+)["']/gi,
    /data-src\s*=\s*["']([^"']+)["']/gi,
    /poster\s*=\s*["']([^"']+)["']/gi,
    /action\s*=\s*["']([^"']+)["']/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let raw = match[1].trim();

      if (pattern.source.includes("srcset")) {
        const parts = raw.split(",");
        for (const part of parts) {
          const u = part.trim().split(/\s+/)[0];
          if (u) processUrl(u, base, urls);
        }
        continue;
      }

      if (pattern.source.includes("url")) {
        raw = raw.replace(/^["']/, "").replace(/["']$/, "");
      }

      processUrl(raw, base, urls);
    }
  }

  return urls;
}

function processUrl(raw: string, base: URL, urls: Set<string>) {
  if (
    !raw ||
    raw.startsWith("data:") ||
    raw.startsWith("javascript:") ||
    raw.startsWith("mailto:") ||
    raw.startsWith("#") ||
    raw.startsWith("tel:")
  ) {
    return;
  }

  try {
    const resolved = new URL(raw, base).href;
    const resolvedUrl = new URL(resolved);
    if (resolvedUrl.hostname === base.hostname) {
      urls.add(resolved);
    }
  } catch {
    // skip invalid URLs
  }
}

async function fetchResource(
  url: string,
  timeout: number = 10000
): Promise<{ data: Buffer; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    clearTimeout(timer);

    if (!res.ok) return null;

    const ct = getContentType(res);
    const arrayBuffer = await res.arrayBuffer();
    return { data: Buffer.from(arrayBuffer), contentType: ct };
  } catch {
    return null;
  }
}

function rewriteUrls(
  html: string,
  baseUrl: string,
  urlToPath: Map<string, string>
): string {
  const base = new URL(baseUrl);
  let result = html;

  const rewrite = (
    _match: string,
    attr: string,
    quote: string,
    raw: string
  ): string => {
    if (
      raw.startsWith("data:") ||
      raw.startsWith("javascript:") ||
      raw.startsWith("mailto:") ||
      raw.startsWith("#") ||
      raw.startsWith("tel:")
    ) {
      return `${attr}=${quote}${raw}${quote}`;
    }

    try {
      const resolved = new URL(raw, base).href;
      const localPath = urlToPath.get(resolved);
      if (localPath) {
        return `${attr}=${quote}${localPath}${quote}`;
      }
    } catch {
      // keep original
    }

    return `${attr}=${quote}${raw}${quote}`;
  };

  result = result.replace(
    /(href|src|poster|action|data-src)\s*=\s*["']([^"']+)["']/gi,
    (match, attr, raw) => rewrite(match, attr, '"', raw)
  );

  result = result.replace(
    /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi,
    (match, raw) => {
      const cleaned = raw.replace(/^["']/, "").replace(/["']$/, "");
      if (cleaned.startsWith("data:")) return match;
      try {
        const resolved = new URL(cleaned, base).href;
        const localPath = urlToPath.get(resolved);
        if (localPath) {
          return `url("${localPath}")`;
        }
      } catch {
        // keep
      }
      return match;
    }
  );

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url: inputUrl } = body;

    if (!inputUrl) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    let targetUrl: URL;
    try {
      targetUrl = normalizeUrl(inputUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      );
    }

    const baseResult = await fetchResource(targetUrl.href, 15000);
    if (!baseResult) {
      return NextResponse.json(
        { error: "Failed to fetch the website. Make sure the URL is correct and accessible." },
        { status: 400 }
      );
    }

    const htmlContent = baseResult.data.toString("utf-8");
    const resourceUrls = extractUrls(htmlContent, targetUrl.href);

    const zip = new JSZip();
    const files: ClonedFile[] = [];
    const urlToPath = new Map<string, string>();
    let totalSize = 0;

    const indexPath = "index.html";
    urlToPath.set(targetUrl.href, indexPath);

    const resourceEntries = Array.from(resourceUrls);
    const fetchPromises: Promise<void>[] = [];
    const maxResources = Math.min(resourceEntries.length, 100);

    for (let i = 0; i < maxResources; i++) {
      const resUrl = resourceEntries[i];
      fetchPromises.push(
        (async () => {
          const result = await fetchResource(resUrl, 8000);
          if (!result) return;

          let filePath = guessFilePath(resUrl, result.contentType, false);

          if (urlToPath.has(resUrl)) return;

          if (zip.file(filePath)) {
            const ext = getExtensionFromUrl(resUrl) || getExtensionFromContentType(result.contentType) || ".bin";
            const name = filePath.replace(/\.[^.]+$/, "") + "_" + i;
            filePath = name + ext;
          }

          urlToPath.set(resUrl, filePath);

          const isText =
            result.contentType.startsWith("text/") ||
            result.contentType.includes("javascript") ||
            result.contentType.includes("json") ||
            result.contentType.includes("xml") ||
            result.contentType.includes("svg");

          if (
            filePath.endsWith(".html") ||
            filePath.endsWith(".htm") ||
            filePath.endsWith(".css")
          ) {
            const text = result.data.toString("utf-8");
            const rewritten = result.contentType.includes("html")
              ? rewriteUrls(text, targetUrl.href, urlToPath)
              : text;
            zip.file(filePath, rewritten);
          } else {
            zip.file(filePath, result.data);
          }

          const size = result.data.length;
          totalSize += size;
          files.push({
            path: filePath,
            size,
            type: result.contentType,
          });
        })()
      );
    }

    await Promise.allSettled(fetchPromises);

    const rewrittenHtml = rewriteUrls(htmlContent, targetUrl.href, urlToPath);
    zip.file(indexPath, rewrittenHtml);
    totalSize += Buffer.byteLength(rewrittenHtml, "utf-8");

    files.unshift({
      path: indexPath,
      size: Buffer.byteLength(rewrittenHtml, "utf-8"),
      type: "text/html",
    });

    const cloneId = crypto.randomUUID().slice(0, 8);

    const cloneResult: CloneResult = {
      id: cloneId,
      url: targetUrl.href,
      domain: targetUrl.hostname,
      files,
      totalSize,
      createdAt: new Date().toISOString(),
    };

    cloneHistory.set(cloneId, cloneResult);

    const outputArray = await zip.generateAsync({ type: "arraybuffer" });

    return new NextResponse(outputArray, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${targetUrl.hostname}.zip"`,
        "X-Clone-Id": cloneId,
        "X-File-Count": String(files.length),
        "X-Total-Size": String(totalSize),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to clone website";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const history = Array.from(cloneHistory.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json({ clones: history });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
