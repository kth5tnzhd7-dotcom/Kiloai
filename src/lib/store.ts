export interface ClickEvent {
  id: string;
  timestamp: string;
  device: "desktop" | "mobile" | "tablet" | "unknown";
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  referrer: string;
  language: string;
  screenWidth: number;
  screenHeight: number;
  timezone: string;
  ip: string;
  country: string;
}

export interface LinkAnalytics {
  totalClicks: number;
  devices: Record<string, number>;
  browsers: Record<string, number>;
  operatingSystems: Record<string, number>;
  referrers: Record<string, number>;
  countries: Record<string, number>;
  languages: Record<string, number>;
  screenResolutions: Record<string, number>;
  timezones: Record<string, number>;
  clicksByHour: Record<string, number>;
  clicksByDay: Record<string, number>;
  recentClicks: ClickEvent[];
}

export interface CloakedLink {
  id: string;
  slug: string;
  destinationUrl: string;
  whitePageTitle: string;
  whitePageDescription: string;
  customDomain: string;
  createdAt: string;
  clicks: number;
  clickEvents: ClickEvent[];
  password: string;
  expiryDate: string;
  isActive: boolean;
  maxClicks: number;
  redirectDelay: number;
  cloakType: "redirect" | "iframe" | "meta-refresh";
}

const links = new Map<string, CloakedLink>();

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createLink(data: {
  destinationUrl: string;
  slug?: string;
  whitePageTitle: string;
  whitePageDescription: string;
  customDomain: string;
  password?: string;
  expiryDate?: string;
  maxClicks?: number;
  redirectDelay?: number;
  cloakType?: "redirect" | "iframe" | "meta-refresh";
}): CloakedLink {
  const slug = data.slug || generateSlug();

  if (links.has(slug)) {
    throw new Error(`Slug "${slug}" is already taken`);
  }

  const link: CloakedLink = {
    id: crypto.randomUUID(),
    slug,
    destinationUrl: data.destinationUrl,
    whitePageTitle: data.whitePageTitle || "Welcome",
    whitePageDescription: data.whitePageDescription || "Loading...",
    customDomain: data.customDomain || "",
    createdAt: new Date().toISOString(),
    clicks: 0,
    clickEvents: [],
    password: data.password || "",
    expiryDate: data.expiryDate || "",
    isActive: true,
    maxClicks: data.maxClicks || 0,
    redirectDelay: data.redirectDelay ?? 3,
    cloakType: data.cloakType || "redirect",
  };

  links.set(slug, link);
  return link;
}

export function getLink(slug: string): CloakedLink | undefined {
  const link = links.get(slug);
  if (!link) return undefined;

  if (link.expiryDate && new Date(link.expiryDate) < new Date()) {
    link.isActive = false;
  }
  if (link.maxClicks > 0 && link.clicks >= link.maxClicks) {
    link.isActive = false;
  }

  return link;
}

export function trackClick(
  slug: string,
  eventData: {
    device: string;
    browser: string;
    browserVersion: string;
    os: string;
    osVersion: string;
    referrer: string;
    language: string;
    screenWidth: number;
    screenHeight: number;
    timezone: string;
    ip: string;
    country: string;
  }
): void {
  const link = links.get(slug);
  if (!link) return;

  link.clicks += 1;

  const event: ClickEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    device: eventData.device as ClickEvent["device"],
    browser: eventData.browser,
    browserVersion: eventData.browserVersion,
    os: eventData.os,
    osVersion: eventData.osVersion,
    referrer: eventData.referrer || "Direct",
    language: eventData.language || "Unknown",
    screenWidth: eventData.screenWidth || 0,
    screenHeight: eventData.screenHeight || 0,
    timezone: eventData.timezone || "Unknown",
    ip: eventData.ip || "Unknown",
    country: eventData.country || "Unknown",
  };

  link.clickEvents.push(event);

  if (link.maxClicks > 0 && link.clicks >= link.maxClicks) {
    link.isActive = false;
  }
}

export function getAnalytics(slug: string): LinkAnalytics | null {
  const link = links.get(slug);
  if (!link) return null;

  const devices: Record<string, number> = {};
  const browsers: Record<string, number> = {};
  const operatingSystems: Record<string, number> = {};
  const referrers: Record<string, number> = {};
  const countries: Record<string, number> = {};
  const languages: Record<string, number> = {};
  const screenResolutions: Record<string, number> = {};
  const timezones: Record<string, number> = {};
  const clicksByHour: Record<string, number> = {};
  const clicksByDay: Record<string, number> = {};

  for (const event of link.clickEvents) {
    devices[event.device] = (devices[event.device] || 0) + 1;
    browsers[event.browser] = (browsers[event.browser] || 0) + 1;
    operatingSystems[event.os] = (operatingSystems[event.os] || 0) + 1;
    referrers[event.referrer] = (referrers[event.referrer] || 0) + 1;
    countries[event.country] = (countries[event.country] || 0) + 1;
    languages[event.language] = (languages[event.language] || 0) + 1;

    const res = `${event.screenWidth}x${event.screenHeight}`;
    if (res !== "0x0") {
      screenResolutions[res] = (screenResolutions[res] || 0) + 1;
    }

    timezones[event.timezone] = (timezones[event.timezone] || 0) + 1;

    const date = new Date(event.timestamp);
    const hour = date.getHours().toString().padStart(2, "0") + ":00";
    const day = date.toISOString().split("T")[0];
    clicksByHour[hour] = (clicksByHour[hour] || 0) + 1;
    clicksByDay[day] = (clicksByDay[day] || 0) + 1;
  }

  return {
    totalClicks: link.clicks,
    devices,
    browsers,
    operatingSystems,
    referrers,
    countries,
    languages,
    screenResolutions,
    timezones,
    clicksByHour,
    clicksByDay,
    recentClicks: [...link.clickEvents].reverse().slice(0, 50),
  };
}

export function getAllLinks(): CloakedLink[] {
  return Array.from(links.values())
    .map((link) => {
      if (link.expiryDate && new Date(link.expiryDate) < new Date()) {
        link.isActive = false;
      }
      if (link.maxClicks > 0 && link.clicks >= link.maxClicks) {
        link.isActive = false;
      }
      return link;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function deleteLink(slug: string): boolean {
  return links.delete(slug);
}

export function toggleLink(slug: string): CloakedLink | null {
  const link = links.get(slug);
  if (!link) return null;
  link.isActive = !link.isActive;
  return link;
}

export function updateLink(
  slug: string,
  data: Partial<{
    destinationUrl: string;
    whitePageTitle: string;
    whitePageDescription: string;
    customDomain: string;
    password: string;
    expiryDate: string;
    maxClicks: number;
    redirectDelay: number;
    cloakType: "redirect" | "iframe" | "meta-refresh";
    isActive: boolean;
  }>
): CloakedLink | null {
  const link = links.get(slug);
  if (!link) return null;

  if (data.destinationUrl !== undefined)
    link.destinationUrl = data.destinationUrl;
  if (data.whitePageTitle !== undefined)
    link.whitePageTitle = data.whitePageTitle;
  if (data.whitePageDescription !== undefined)
    link.whitePageDescription = data.whitePageDescription;
  if (data.customDomain !== undefined) link.customDomain = data.customDomain;
  if (data.password !== undefined) link.password = data.password;
  if (data.expiryDate !== undefined) link.expiryDate = data.expiryDate;
  if (data.maxClicks !== undefined) link.maxClicks = data.maxClicks;
  if (data.redirectDelay !== undefined) link.redirectDelay = data.redirectDelay;
  if (data.cloakType !== undefined) link.cloakType = data.cloakType;
  if (data.isActive !== undefined) link.isActive = data.isActive;

  return link;
}
