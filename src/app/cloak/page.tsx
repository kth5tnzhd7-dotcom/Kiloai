"use client";

import { useState, useEffect, useCallback } from "react";

interface CloakedLink {
  id: string;
  slug: string;
  destinationUrl: string;
  whitePageTitle: string;
  whitePageDescription: string;
  customDomain: string;
  createdAt: string;
  clicks: number;
}

export default function CloakPage() {
  const [links, setLinks] = useState<CloakedLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingLinks, setFetchingLinks] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    destinationUrl: "",
    slug: "",
    whitePageTitle: "Welcome",
    whitePageDescription: "Loading your content...",
    customDomain: "",
  });

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/links");
      const data = await res.json();
      setLinks(data.links || []);
    } catch {
      // silently fail on fetch
    } finally {
      setFetchingLinks(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create link");
        return;
      }

      setLinks((prev) => [data.link, ...prev]);
      setForm({
        destinationUrl: "",
        slug: "",
        whitePageTitle: "Welcome",
        whitePageDescription: "Loading your content...",
        customDomain: "",
      });
    } catch {
      setError("Failed to create link");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slug: string) => {
    try {
      await fetch(`/api/links?slug=${slug}`, { method: "DELETE" });
      setLinks((prev) => prev.filter((l) => l.slug !== slug));
    } catch {
      // silently fail
    }
  };

  const getShortUrl = (link: CloakedLink) => {
    const domain = link.customDomain || window.location.origin;
    return `${domain}/s/${link.slug}`;
  };

  const copyToClipboard = (link: CloakedLink) => {
    navigator.clipboard.writeText(getShortUrl(link));
    setCopiedSlug(link.slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <header className="mb-12">
          <h1 className="text-3xl font-bold mb-2">Link Cloaking</h1>
          <p className="text-neutral-400">
            Create short URLs with custom white pages that cloak your destination
            links.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-10"
        >
          <h2 className="text-lg font-semibold mb-6">Create Cloaked Link</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Destination URL *
              </label>
              <input
                type="url"
                required
                placeholder="https://example.com/your-affiliate-link"
                value={form.destinationUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, destinationUrl: e.target.value }))
                }
                className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Custom Slug (optional)
              </label>
              <input
                type="text"
                placeholder="my-link (auto-generated if empty)"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Custom Domain (optional)
            </label>
            <input
              type="text"
              placeholder="https://yourdomain.com"
              value={form.customDomain}
              onChange={(e) =>
                setForm((f) => ({ ...f, customDomain: e.target.value }))
              }
              className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                White Page Title
              </label>
              <input
                type="text"
                placeholder="Welcome"
                value={form.whitePageTitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, whitePageTitle: e.target.value }))
                }
                className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                White Page Description
              </label>
              <input
                type="text"
                placeholder="Loading your content..."
                value={form.whitePageDescription}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    whitePageDescription: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "Creating..." : "Create Cloaked Link"}
          </button>
        </form>

        <section>
          <h2 className="text-lg font-semibold mb-4">
            Your Links {links.length > 0 && `(${links.length})`}
          </h2>

          {fetchingLinks ? (
            <p className="text-neutral-500 text-sm">Loading links...</p>
          ) : links.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
              <p className="text-neutral-500 text-sm">
                No cloaked links yet. Create your first one above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm text-blue-400 font-mono truncate">
                          {getShortUrl(link)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(link)}
                          className="shrink-0 px-2 py-0.5 text-xs bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
                        >
                          {copiedSlug === link.slug ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <p className="text-xs text-neutral-500 truncate mb-1">
                        → {link.destinationUrl}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-neutral-600">
                        <span>{link.whitePageTitle}</span>
                        <span>{link.clicks} clicks</span>
                        <span>
                          {new Date(link.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(link.slug)}
                      className="shrink-0 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
