import { db } from "@/db";
import { links, clickEvents, domains, deployments, cloneHistory, savedScripts } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

// --- Links ---

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createLink(data: {
  destinationUrl: string;
  slug?: string;
  whitePageTitle: string;
  whitePageDescription: string;
  customDomain: string;
  password?: string;
  expiryDate?: string;
  maxClicks?: number;
  redirectDelay?: number;
  cloakType?: string;
  trafficBotMode?: string;
  trafficBotRedirectUrl?: string;
  trafficBlockedReferrers?: string[];
  trafficAllowedReferrers?: string[];
  trafficBlockedUserAgents?: string[];
  trafficAllowedUserAgents?: string[];
}) {
  const slug = data.slug || generateSlug();

  const existing = await db.select().from(links).where(eq(links.slug, slug)).limit(1);
  if (existing.length > 0) {
    throw new Error(`Slug "${slug}" is already taken`);
  }

  const id = crypto.randomUUID();
  const nicegramAdUrl = `https://t.me/nicegram_bot?start=ad_${slug}`;

  await db.insert(links).values({
    id,
    slug,
    destinationUrl: data.destinationUrl,
    whitePageTitle: data.whitePageTitle || "Welcome",
    whitePageDescription: data.whitePageDescription || "Loading...",
    customDomain: data.customDomain || "",
    password: data.password || "",
    expiryDate: data.expiryDate || "",
    isActive: true,
    maxClicks: data.maxClicks || 0,
    redirectDelay: data.redirectDelay ?? 3,
    cloakType: (data.cloakType as string) || "redirect",
    trafficBotMode: data.trafficBotMode || "block",
    trafficBotRedirectUrl: data.trafficBotRedirectUrl || "",
    trafficBlockedReferrers: JSON.stringify(data.trafficBlockedReferrers || []),
    trafficAllowedReferrers: JSON.stringify(data.trafficAllowedReferrers || []),
    trafficBlockedUserAgents: JSON.stringify(data.trafficBlockedUserAgents || []),
    trafficAllowedUserAgents: JSON.stringify(data.trafficAllowedUserAgents || []),
    nicegramAdUrl,
    clicks: 0,
    createdAt: new Date().toISOString(),
  });

  return { id, slug, nicegramAdUrl };
}

export async function getLink(slug: string) {
  const rows = await db.select().from(links).where(eq(links.slug, slug)).limit(1);
  if (rows.length === 0) return null;
  const link = rows[0];

  if (link.expiryDate && new Date(link.expiryDate) < new Date()) {
    await db.update(links).set({ isActive: false }).where(eq(links.slug, slug));
    link.isActive = false;
  }
  if (link.maxClicks > 0 && link.clicks >= link.maxClicks) {
    await db.update(links).set({ isActive: false }).where(eq(links.slug, slug));
    link.isActive = false;
  }

  return {
    ...link,
    trafficBlockedReferrers: JSON.parse(link.trafficBlockedReferrers || "[]"),
    trafficAllowedReferrers: JSON.parse(link.trafficAllowedReferrers || "[]"),
    trafficBlockedUserAgents: JSON.parse(link.trafficBlockedUserAgents || "[]"),
    trafficAllowedUserAgents: JSON.parse(link.trafficAllowedUserAgents || "[]"),
  };
}

export async function getAllLinks() {
  const rows = await db.select().from(links).orderBy(desc(links.createdAt));
  return rows.map((l) => ({
    ...l,
    trafficBlockedReferrers: JSON.parse(l.trafficBlockedReferrers || "[]"),
    trafficAllowedReferrers: JSON.parse(l.trafficAllowedReferrers || "[]"),
    trafficBlockedUserAgents: JSON.parse(l.trafficBlockedUserAgents || "[]"),
    trafficAllowedUserAgents: JSON.parse(l.trafficAllowedUserAgents || "[]"),
  }));
}

export async function deleteLink(slug: string) {
  await db.delete(links).where(eq(links.slug, slug));
  await db.delete(clickEvents).where(eq(clickEvents.linkSlug, slug));
  return true;
}

export async function toggleLink(slug: string) {
  const rows = await db.select().from(links).where(eq(links.slug, slug)).limit(1);
  if (rows.length === 0) return null;
  const newVal = !rows[0].isActive;
  await db.update(links).set({ isActive: newVal }).where(eq(links.slug, slug));
  return { ...rows[0], isActive: newVal };
}

export async function updateLink(
  slug: string,
  data: Record<string, unknown>
) {
  const updateData: Record<string, unknown> = {};
  if (data.destinationUrl !== undefined) updateData.destinationUrl = data.destinationUrl;
  if (data.whitePageTitle !== undefined) updateData.whitePageTitle = data.whitePageTitle;
  if (data.whitePageDescription !== undefined) updateData.whitePageDescription = data.whitePageDescription;
  if (data.customDomain !== undefined) updateData.customDomain = data.customDomain;
  if (data.password !== undefined) updateData.password = data.password;
  if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;
  if (data.maxClicks !== undefined) updateData.maxClicks = data.maxClicks;
  if (data.redirectDelay !== undefined) updateData.redirectDelay = data.redirectDelay;
  if (data.cloakType !== undefined) updateData.cloakType = data.cloakType;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.trafficBotMode !== undefined) updateData.trafficBotMode = data.trafficBotMode;
  if (data.trafficBotRedirectUrl !== undefined) updateData.trafficBotRedirectUrl = data.trafficBotRedirectUrl;
  if (data.trafficBlockedReferrers !== undefined) updateData.trafficBlockedReferrers = JSON.stringify(data.trafficBlockedReferrers);
  if (data.trafficAllowedReferrers !== undefined) updateData.trafficAllowedReferrers = JSON.stringify(data.trafficAllowedReferrers);
  if (data.trafficBlockedUserAgents !== undefined) updateData.trafficBlockedUserAgents = JSON.stringify(data.trafficBlockedUserAgents);
  if (data.trafficAllowedUserAgents !== undefined) updateData.trafficAllowedUserAgents = JSON.stringify(data.trafficAllowedUserAgents);

  if (Object.keys(updateData).length > 0) {
    await db.update(links).set(updateData).where(eq(links.slug, slug));
  }

  return getLink(slug);
}

// --- Click Events ---

export async function trackClick(
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
    isBot: boolean;
    botType: string;
    verdict: string;
  }
) {
  await db.insert(clickEvents).values({
    id: crypto.randomUUID(),
    linkSlug: slug,
    timestamp: new Date().toISOString(),
    device: eventData.device,
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
    isBot: eventData.isBot,
    botType: eventData.botType,
    verdict: eventData.verdict,
  });

  await db
    .update(links)
    .set({ clicks: sql`${links.clicks} + 1` })
    .where(eq(links.slug, slug));

  // Check max clicks
  const linkRows = await db.select().from(links).where(eq(links.slug, slug)).limit(1);
  if (linkRows.length > 0 && linkRows[0].maxClicks > 0 && linkRows[0].clicks + 1 >= linkRows[0].maxClicks) {
    await db.update(links).set({ isActive: false }).where(eq(links.slug, slug));
  }
}

export async function getAnalytics(slug: string) {
  const events = await db
    .select()
    .from(clickEvents)
    .where(eq(clickEvents.linkSlug, slug))
    .orderBy(desc(clickEvents.timestamp));

  const devices: Record<string, number> = {};
  const browsers: Record<string, number> = {};
  const operatingSystems: Record<string, number> = {};
  const referrers: Record<string, number> = {};
  const countries: Record<string, number> = {};
  const botTypes: Record<string, number> = {};
  const verdicts: Record<string, number> = {};
  const clicksByDay: Record<string, number> = {};
  let realClicks = 0;
  let botClicks = 0;
  let blockedClicks = 0;

  for (const e of events) {
    devices[e.device] = (devices[e.device] || 0) + 1;
    browsers[e.browser] = (browsers[e.browser] || 0) + 1;
    operatingSystems[e.os] = (operatingSystems[e.os] || 0) + 1;
    const ref = e.referrer || "Direct";
    referrers[ref] = (referrers[ref] || 0) + 1;
    const ctry = e.country || "Unknown";
    countries[ctry] = (countries[ctry] || 0) + 1;
    if (e.isBot) {
      botClicks++;
      const bt = e.botType || "Unknown";
      botTypes[bt] = (botTypes[bt] || 0) + 1;
    } else {
      realClicks++;
    }
    verdicts[e.verdict] = (verdicts[e.verdict] || 0) + 1;
    if (e.verdict === "block") blockedClicks++;
    const day = e.timestamp?.split("T")[0] || "unknown";
    clicksByDay[day] = (clicksByDay[day] || 0) + 1;
  }

  return {
    totalClicks: events.length,
    realClicks,
    botClicks,
    blockedClicks,
    devices,
    browsers,
    operatingSystems,
    referrers,
    countries,
    botTypes,
    verdicts,
    clicksByDay,
    recentClicks: events.slice(0, 50),
  };
}

// --- Domains ---

function generateVerificationCode(domain: string): string {
  return `cloak-verify-${domain.replace(/[^a-z0-9]/g, "")}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function addDomain(domain: string, linkedSlug: string) {
  const normalized = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

  const existing = await db.select().from(domains).where(eq(domains.domain, normalized)).limit(1);
  if (existing.length > 0) {
    throw new Error(`Domain "${normalized}" is already registered`);
  }

  const code = generateVerificationCode(normalized);
  const id = crypto.randomUUID();

  await db.insert(domains).values({
    id,
    domain: normalized,
    verified: false,
    verificationCode: code,
    linkedSlug: linkedSlug || "",
    sslEnabled: true,
    createdAt: new Date().toISOString(),
  });

  return { id, domain: normalized, verificationCode: code, linkedSlug, verified: false, sslEnabled: true, createdAt: new Date().toISOString() };
}

export async function getAllDomains() {
  return db.select().from(domains).orderBy(desc(domains.createdAt));
}

export async function getDomain(domain: string) {
  const normalized = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const rows = await db.select().from(domains).where(eq(domains.domain, normalized)).limit(1);
  return rows[0] || null;
}

export async function verifyDomain(domain: string) {
  const normalized = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  await db.update(domains).set({ verified: true }).where(eq(domains.domain, normalized));
  return getDomain(normalized);
}

export async function deleteDomain(domain: string) {
  const normalized = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  await db.delete(domains).where(eq(domains.domain, normalized));
  return true;
}

export async function updateDomain(domain: string, data: { linkedSlug?: string; verified?: boolean }) {
  const normalized = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const updateData: Record<string, unknown> = {};
  if (data.linkedSlug !== undefined) updateData.linkedSlug = data.linkedSlug;
  if (data.verified !== undefined) updateData.verified = data.verified;
  if (Object.keys(updateData).length > 0) {
    await db.update(domains).set(updateData).where(eq(domains.domain, normalized));
  }
  return getDomain(normalized);
}

// --- Deployments ---

export async function createDeployment(data: {
  name: string;
  fileCount: number;
  totalSize: number;
  cpanelUrl?: string;
  cpanelUsername?: string;
  cpanelToken?: string;
  cpanelDir?: string;
}) {
  const id = crypto.randomUUID();

  await db.insert(deployments).values({
    id,
    name: data.name,
    fileCount: data.fileCount,
    totalSize: data.totalSize,
    deployUrl: "",
    cpanelUrl: data.cpanelUrl || "",
    cpanelUsername: data.cpanelUsername || "",
    cpanelToken: data.cpanelToken || "",
    cpanelDir: data.cpanelDir || "public_html",
    status: "pending",
    linkedSlug: "",
    createdAt: new Date().toISOString(),
  });

  return id;
}

export async function getDeployments() {
  return db.select().from(deployments).orderBy(desc(deployments.createdAt));
}

export async function getDeployment(id: string) {
  const rows = await db.select().from(deployments).where(eq(deployments.id, id)).limit(1);
  return rows[0] || null;
}

export async function updateDeployment(id: string, data: { deployUrl?: string; status?: string; linkedSlug?: string }) {
  const updateData: Record<string, unknown> = {};
  if (data.deployUrl !== undefined) updateData.deployUrl = data.deployUrl;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.linkedSlug !== undefined) updateData.linkedSlug = data.linkedSlug;
  if (Object.keys(updateData).length > 0) {
    await db.update(deployments).set(updateData).where(eq(deployments.id, id));
  }
  return getDeployment(id);
}

export async function deleteDeployment(id: string) {
  await db.delete(deployments).where(eq(deployments.id, id));
  return true;
}

// --- Clone History ---

export async function saveClone(data: {
  id: string;
  url: string;
  domain: string;
  fileCount: number;
  totalSize: number;
  filesJson: string;
}) {
  await db.insert(cloneHistory).values({
    ...data,
    createdAt: new Date().toISOString(),
  });
}

export async function getCloneHistory() {
  return db.select().from(cloneHistory).orderBy(desc(cloneHistory.createdAt));
}

// --- Saved Scripts ---

export async function createSavedScript(data: {
  name: string;
  injectHead?: string;
  injectBodyStart?: string;
  injectBodyEnd?: string;
}) {
  const id = crypto.randomUUID();
  await db.insert(savedScripts).values({
    id,
    name: data.name,
    injectHead: data.injectHead || "",
    injectBodyStart: data.injectBodyStart || "",
    injectBodyEnd: data.injectBodyEnd || "",
    createdAt: new Date().toISOString(),
  });
  return { id, ...data, createdAt: new Date().toISOString() };
}

export async function getSavedScripts() {
  return db.select().from(savedScripts).orderBy(desc(savedScripts.createdAt));
}

export async function getSavedScript(id: string) {
  const rows = await db
    .select()
    .from(savedScripts)
    .where(eq(savedScripts.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function deleteSavedScript(id: string) {
  await db.delete(savedScripts).where(eq(savedScripts.id, id));
  return true;
}

export async function updateSavedScript(
  id: string,
  data: { name?: string; injectHead?: string; injectBodyStart?: string; injectBodyEnd?: string }
) {
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.injectHead !== undefined) update.injectHead = data.injectHead;
  if (data.injectBodyStart !== undefined) update.injectBodyStart = data.injectBodyStart;
  if (data.injectBodyEnd !== undefined) update.injectBodyEnd = data.injectBodyEnd;
  if (Object.keys(update).length > 0) {
    await db.update(savedScripts).set(update).where(eq(savedScripts.id, id));
  }
  return getSavedScript(id);
}
