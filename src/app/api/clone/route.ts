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
  return response.headers.get("content-type")?.split(";")[0]?.trim() || "";
}

function getExtFromContentType(ct: string): string {
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
    "font/woff": ".woff",
    "font/woff2": ".woff2",
    "font/ttf": ".ttf",
    "font/otf": ".otf",
    "application/font-woff": ".woff",
    "application/font-woff2": ".woff2",
    "application/octet-stream": ".bin",
  };
  return map[ct] || "";
}

function getExtFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split("/").pop() || "";
    const dotIdx = last.lastIndexOf(".");
    if (dotIdx > 0) return last.slice(dotIdx);
  } catch {
    // ignore
  }
  return "";
}

function resolveFilePath(
  url: string,
  contentType: string,
  usedPaths: Set<string>
): string {
  const parsed = new URL(url);
  let pathname = parsed.pathname;

  // Root path
  if (pathname === "/" || pathname === "") {
    return uniquePath("index.html", usedPaths);
  }

  // Directory path
  if (pathname.endsWith("/")) {
    return uniquePath(pathname.slice(1) + "index.html", usedPaths);
  }

  // Has extension
  const ext = getExtFromUrl(url);
  if (ext) {
    const clean = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    return uniquePath(clean, usedPaths);
  }

  // No extension — try content type
  const ctExt = getExtFromContentType(contentType);
  const base = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  return uniquePath(base + ctExt, usedPaths);
}

function uniquePath(path: string, used: Set<string>): string {
  if (!used.has(path)) {
    used.add(path);
    return path;
  }
  const dot = path.lastIndexOf(".");
  const name = dot > 0 ? path.slice(0, dot) : path;
  const ext = dot > 0 ? path.slice(dot) : "";
  let counter = 1;
  while (used.has(`${name}_${counter}${ext}`)) {
    counter++;
  }
  const final = `${name}_${counter}${ext}`;
  used.add(final);
  return final;
}

function resolveUrl(raw: string, base: URL): string | null {
  if (
    !raw ||
    raw.startsWith("data:") ||
    raw.startsWith("javascript:") ||
    raw.startsWith("mailto:") ||
    raw.startsWith("#") ||
    raw.startsWith("tel:") ||
    raw.startsWith("blob:")
  ) {
    return null;
  }
  try {
    // Handle protocol-relative URLs
    if (raw.startsWith("//")) {
      raw = base.protocol + raw;
    }
    return new URL(raw, base).href;
  } catch {
    return null;
  }
}

function extractUrlsFromHtml(html: string, base: URL): string[] {
  const urls = new Set<string>();

  // Standard href/src attributes
  const attrRe =
    /(?:href|src|poster|action|data-src|data-srcset)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(html)) !== null) {
    const resolved = resolveUrl(m[1].trim(), base);
    if (resolved) urls.add(resolved);
  }

  // srcset attribute (multiple URLs)
  const srcsetRe = /srcset\s*=\s*["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html)) !== null) {
    for (const part of m[1].split(",")) {
      const u = part.trim().split(/\s+/)[0];
      const resolved = resolveUrl(u, base);
      if (resolved) urls.add(resolved);
    }
  }

  // Inline style url()
  const styleRe = /style\s*=\s*["'][^"']*url\s*\(\s*["']?([^"')]+?)["']?\s*\)[^"']*["']/gi;
  while ((m = styleRe.exec(html)) !== null) {
    const resolved = resolveUrl(m[1].trim(), base);
    if (resolved) urls.add(resolved);
  }

  // <style> blocks url()
  const styleBlockRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = styleBlockRe.exec(html)) !== null) {
    const cssUrls = extractUrlsFromCss(m[1], base);
    for (const u of cssUrls) urls.add(u);
  }

  // <link rel="preload">, <link rel="prefetch">, etc.
  const linkRe =
    /<link[^>]+(?:rel|as)\s*=\s*["'][^"']*["'][^>]+href\s*=\s*["']([^"']+)["']|<link[^>]+href\s*=\s*["']([^"']+)["'][^>]+(?:rel|as)\s*=\s*["'][^"']*["']/gi;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1] || m[2];
    const resolved = resolveUrl(href.trim(), base);
    if (resolved) urls.add(resolved);
  }

  // <meta property="og:image">
  const metaRe =
    /<meta[^>]+(?:property|name)\s*=\s*["'](?:og:image|twitter:image)["'][^>]+content\s*=\s*["']([^"']+)["']/gi;
  while ((m = metaRe.exec(html)) !== null) {
    const resolved = resolveUrl(m[1].trim(), base);
    if (resolved) urls.add(resolved);
  }

  return Array.from(urls);
}

function extractUrlsFromCss(css: string, base: URL): string[] {
  const urls = new Set<string>();

  // url() references
  const urlRe = /url\s*\(\s*["']?([^"')]+?)["']?\s*\)/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(css)) !== null) {
    const resolved = resolveUrl(m[1].trim(), base);
    if (resolved) urls.add(resolved);
  }

  // @import
  const importRe = /@import\s+["']([^"']+)["']/gi;
  while ((m = importRe.exec(css)) !== null) {
    const resolved = resolveUrl(m[1].trim(), base);
    if (resolved) urls.add(resolved);
  }

  return Array.from(urls);
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
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
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

function rewriteTextContent(
  content: string,
  isCss: boolean,
  base: URL,
  urlToPath: Map<string, string>
): string {
  let result = content;

  // Rewrite attr="url" patterns (href, src, etc.)
  result = result.replace(
    /((?:href|src|poster|action|data-src)\s*=\s*)(["'])([^"']+)\2/gi,
    (_match, prefix, quote, raw) => {
      if (
        raw.startsWith("data:") ||
        raw.startsWith("javascript:") ||
        raw.startsWith("mailto:") ||
        raw.startsWith("#") ||
        raw.startsWith("tel:")
      ) {
        return _match;
      }
      try {
        let resolvedRaw = raw;
        if (raw.startsWith("//")) resolvedRaw = base.protocol + raw;
        const resolved = new URL(resolvedRaw, base).href;
        const local = urlToPath.get(resolved);
        if (local) return `${prefix}${quote}${local}${quote}`;
      } catch {
        // keep
      }
      return _match;
    }
  );

  // Rewrite url() in styles (both inline and CSS files)
  const urlRe = /url\s*\(\s*["']?([^"')]+?)["']?\s*\)/gi;
  result = result.replace(urlRe, (match, raw) => {
    const cleaned = raw.trim();
    if (
      cleaned.startsWith("data:") ||
      cleaned.startsWith("javascript:") ||
      cleaned.startsWith("#")
    ) {
      return match;
    }
    try {
      let resolvedRaw = cleaned;
      if (cleaned.startsWith("//")) resolvedRaw = base.protocol + cleaned;
      const resolved = new URL(resolvedRaw, base).href;
      const local = urlToPath.get(resolved);
      if (local) return `url("${local}")`;
    } catch {
      // keep
    }
    return match;
  });

  // Rewrite srcset
  result = result.replace(
    /(srcset\s*=\s*)(["'])([^"']+)\2/gi,
    (_match, prefix, quote, srcsetValue) => {
      const rewritten = srcsetValue
        .split(",")
        .map((part: string) => {
          const trimmed = part.trim();
          const [u, ...rest] = trimmed.split(/\s+/);
          try {
            let resolvedRaw = u;
            if (u.startsWith("//")) resolvedRaw = base.protocol + u;
            const resolved = new URL(resolvedRaw, base).href;
            const local = urlToPath.get(resolved);
            if (local) return [local, ...rest].join(" ");
          } catch {
            // keep
          }
          return trimmed;
        })
        .join(", ");
      return `${prefix}${quote}${rewritten}${quote}`;
    }
  );

  // Rewrite @import in CSS
  if (isCss) {
    result = result.replace(
      /(@import\s+["'])([^"']+)(["'])/gi,
      (_match, prefix, raw, quote) => {
        try {
          let resolvedRaw = raw;
          if (raw.startsWith("//")) resolvedRaw = base.protocol + raw;
          const resolved = new URL(resolvedRaw, base).href;
          const local = urlToPath.get(resolved);
          if (local) return `${prefix}${local}${quote}`;
        } catch {
          // keep
        }
        return _match;
      }
    );
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url: inputUrl } = body;

    if (!inputUrl) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let targetUrl: URL;
    try {
      targetUrl = normalizeUrl(inputUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Step 1: Fetch base page
    const baseResult = await fetchResource(targetUrl.href, 15000);
    if (!baseResult) {
      return NextResponse.json(
        {
          error:
            "Failed to fetch the website. Make sure the URL is correct and accessible.",
        },
        { status: 400 }
      );
    }

    const htmlContent = baseResult.data.toString("utf-8");

    // Step 2: Extract all URLs from HTML
    const htmlUrls = extractUrlsFromHtml(htmlContent, targetUrl);
    const allResourceUrls = new Set<string>(htmlUrls);

    // Step 3: First pass — fetch all resources and discover CSS sub-resources
    const zip = new JSZip();
    const usedPaths = new Set<string>();
    const urlToPath = new Map<string, string>();
    const urlToData = new Map<
      string,
      { data: Buffer; contentType: string }
    >();

    // Reserve index.html
    usedPaths.add("index.html");
    urlToPath.set(targetUrl.href, "index.html");

    const toFetch = Array.from(allResourceUrls);
    const maxRes = Math.min(toFetch.length, 150);

    // Fetch initial resources
    const fetchBatch = toFetch.slice(0, maxRes);
    const fetchResults = await Promise.allSettled(
      fetchBatch.map((url) => fetchResource(url, 10000))
    );

    for (let i = 0; i < fetchBatch.length; i++) {
      const fr = fetchResults[i];
      const result = fr.status === "fulfilled" ? fr.value : null;
      if (!result) continue;

      const url = fetchBatch[i];
      urlToData.set(url, result);

      const filePath = resolveFilePath(url, result.contentType, usedPaths);
      urlToPath.set(url, filePath);

      // If CSS, extract sub-urls
      if (
        result.contentType.includes("css") ||
        filePath.endsWith(".css")
      ) {
        const cssText = result.data.toString("utf-8");
        const cssUrls = extractUrlsFromCss(cssText, targetUrl);
        for (const cssUrl of cssUrls) {
          if (!allResourceUrls.has(cssUrl) && !urlToData.has(cssUrl)) {
            allResourceUrls.add(cssUrl);
          }
        }
      }
    }

    // Step 4: Fetch newly discovered CSS sub-resources
    const newUrls = Array.from(allResourceUrls).filter(
      (u) => !urlToData.has(u)
    );
    const newMax = Math.min(newUrls.length, 50);

    if (newMax > 0) {
      const newResults = await Promise.allSettled(
        newUrls.slice(0, newMax).map((url) => fetchResource(url, 8000))
      );

      for (let i = 0; i < newMax; i++) {
        const nr = newResults[i];
        const result = nr.status === "fulfilled" ? nr.value : null;
        if (!result) continue;
        const url = newUrls[i];
        urlToData.set(url, result);
        const filePath = resolveFilePath(url, result.contentType, usedPaths);
        urlToPath.set(url, filePath);
      }
    }

    // Step 5: Write all files to ZIP with rewritten URLs
    const files: ClonedFile[] = [];
    let totalSize = 0;

    for (const [url, data] of urlToData) {
      if (url === targetUrl.href) continue; // handle index.html separately

      const filePath = urlToPath.get(url);
      if (!filePath) continue;

      const isTextFile =
        filePath.endsWith(".html") ||
        filePath.endsWith(".htm") ||
        filePath.endsWith(".css") ||
        filePath.endsWith(".js") ||
        filePath.endsWith(".svg") ||
        filePath.endsWith(".json") ||
        filePath.endsWith(".xml");

      if (isTextFile) {
        const text = data.data.toString("utf-8");
        const isCss = filePath.endsWith(".css");
        const resourceBase = new URL(url);
        const rewritten = rewriteTextContent(
          text,
          isCss,
          resourceBase,
          urlToPath
        );
        zip.file(filePath, rewritten);
        totalSize += Buffer.byteLength(rewritten, "utf-8");
      } else {
        zip.file(filePath, data.data);
        totalSize += data.data.length;
      }

      files.push({
        path: filePath,
        size: data.data.length,
        type: data.contentType,
      });
    }

    // Step 6: Rewrite and save index.html
    const rewrittenHtml = rewriteTextContent(
      htmlContent,
      false,
      targetUrl,
      urlToPath
    );
    zip.file("index.html", rewrittenHtml);
    totalSize += Buffer.byteLength(rewrittenHtml, "utf-8");

    files.unshift({
      path: "index.html",
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
