export function detectDevice(ua: string): "desktop" | "mobile" | "tablet" | "unknown" {
  if (!ua) return "unknown";
  const lower = ua.toLowerCase();
  if (/ipad|tablet|kindle|silk|playbook/.test(lower)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|windows phone/.test(lower))
    return "mobile";
  if (/android|tablet/.test(lower)) return "tablet";
  if (/windows|macintosh|linux|cros/.test(lower)) return "desktop";
  return "unknown";
}

export function detectBrowser(ua: string): { name: string; version: string } {
  if (!ua) return { name: "Unknown", version: "" };

  const browsers: [RegExp, string][] = [
    [/EdgA?\/([\d.]+)/, "Edge"],
    [/OPR\/([\d.]+)/, "Opera"],
    [/Chrome\/([\d.]+)/, "Chrome"],
    [/CriOS\/([\d.]+)/, "Chrome"],
    [/Firefox\/([\d.]+)/, "Firefox"],
    [/FxiOS\/([\d.]+)/, "Firefox"],
    [/Safari\/([\d.]+)/, "Safari"],
    [/Version\/([\d.]+).*Safari/, "Safari"],
    [/MSIE ([\d.]+)/, "IE"],
    [/Trident\/.*rv:([\d.]+)/, "IE"],
  ];

  for (const [regex, name] of browsers) {
    const match = ua.match(regex);
    if (match) {
      return { name, version: match[1] || "" };
    }
  }

  return { name: "Unknown", version: "" };
}

export function detectOS(ua: string): { name: string; version: string } {
  if (!ua) return { name: "Unknown", version: "" };

  const systems: [RegExp, string][] = [
    [/Windows NT ([\d.]+)/, "Windows"],
    [/Mac OS X ([\d_.]+)/, "macOS"],
    [/iPhone OS ([\d_]+)/, "iOS"],
    [/iPad.*OS ([\d_]+)/, "iPadOS"],
    [/Android ([\d.]+)/, "Android"],
    [/CrOS/, "Chrome OS"],
    [/Linux/, "Linux"],
  ];

  for (const [regex, name] of systems) {
    const match = ua.match(regex);
    if (match) {
      const version = (match[1] || "").replace(/_/g, ".");
      return { name, version };
    }
  }

  return { name: "Unknown", version: "" };
}

export function collectAnalytics() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const device = detectDevice(ua);
  const browser = detectBrowser(ua);
  const os = detectOS(ua);

  return {
    device,
    browser: browser.name,
    browserVersion: browser.version,
    os: os.name,
    osVersion: os.version,
    referrer: typeof document !== "undefined" ? document.referrer : "",
    language: typeof navigator !== "undefined" ? navigator.language : "",
    screenWidth: typeof screen !== "undefined" ? screen.width : 0,
    screenHeight: typeof screen !== "undefined" ? screen.height : 0,
    timezone:
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "",
  };
}
