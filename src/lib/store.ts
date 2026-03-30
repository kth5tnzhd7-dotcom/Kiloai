export interface CloakedLink {
  id: string;
  slug: string;
  destinationUrl: string;
  whitePageTitle: string;
  whitePageDescription: string;
  customDomain: string;
  createdAt: string;
  clicks: number;
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
}): CloakedLink {
  const slug = data.slug || generateSlug();

  if (links.has(slug)) {
    throw new Error(`Slug "${slug}" is already taken`);
  }

  const link: CloakedLink = {
    id: crypto.randomUUID(),
    slug,
    destinationUrl: data.destinationUrl,
    whitePageTitle: data.whitePageTitle,
    whitePageDescription: data.whitePageDescription,
    customDomain: data.customDomain,
    createdAt: new Date().toISOString(),
    clicks: 0,
  };

  links.set(slug, link);
  return link;
}

export function getLink(slug: string): CloakedLink | undefined {
  return links.get(slug);
}

export function trackClick(slug: string): void {
  const link = links.get(slug);
  if (link) {
    link.clicks += 1;
  }
}

export function getAllLinks(): CloakedLink[] {
  return Array.from(links.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function deleteLink(slug: string): boolean {
  return links.delete(slug);
}
