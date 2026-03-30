"use client";

import { useState, useEffect, useCallback } from "react";

interface ClickEvent {
  id: string;
  timestamp: string;
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
  country: string;
}

interface LinkAnalytics {
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

interface CloakedLink {
  id: string;
  slug: string;
  destinationUrl: string;
  whitePageTitle: string;
  whitePageDescription: string;
  customDomain: string;
  createdAt: string;
  clicks: number;
  password: string;
  expiryDate: string;
  isActive: boolean;
  maxClicks: number;
  redirectDelay: number;
  cloakType: "redirect" | "iframe" | "meta-refresh";
}

function BarChart({
  data,
  color = "bg-blue-500",
}: {
  data: Record<string, number>;
  color?: string;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  if (entries.length === 0) {
    return (
      <p className="text-xs text-neutral-500 italic">No data yet</p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.slice(0, 8).map(([label, value]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 w-28 truncate shrink-0">
            {label}
          </span>
          <div className="flex-1 h-5 bg-neutral-800 rounded overflow-hidden">
            <div
              className={`h-full ${color} rounded transition-all duration-500`}
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-neutral-300 w-10 text-right shrink-0">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-4">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
    </div>
  );
}

function AnalyticsPanel({
  slug,
  onClose,
}: {
  slug: string;
  onClose: () => void;
}) {
  const [analytics, setAnalytics] = useState<LinkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    "overview" | "devices" | "browsers" | "sources" | "clicks"
  >("overview");

  useEffect(() => {
    fetch(`/api/links?slug=${slug}&analytics=true`)
      .then((res) => res.json())
      .then((data) => {
        setAnalytics(data.analytics);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
        <p className="text-neutral-400 text-sm">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
        <p className="text-neutral-400 text-sm">No analytics data available</p>
        <button
          onClick={onClose}
          className="mt-4 text-xs text-neutral-500 hover:text-white"
        >
          Close
        </button>
      </div>
    );
  }

  const topDevice = Object.entries(analytics.devices).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const topBrowser = Object.entries(analytics.browsers).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const topOS = Object.entries(analytics.operatingSystems).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "devices", label: "Devices" },
    { key: "browsers", label: "Browsers" },
    { key: "sources", label: "Sources" },
    { key: "clicks", label: "Click Log" },
  ] as const;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
        <h3 className="text-sm font-semibold">
          Analytics — /s/{slug}
        </h3>
        <button
          onClick={onClose}
          className="text-neutral-500 hover:text-white text-xs"
        >
          Close
        </button>
      </div>

      <div className="flex border-b border-neutral-800 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total Clicks"
                value={analytics.totalClicks}
              />
              <StatCard
                label="Top Device"
                value={topDevice?.[0] || "—"}
                sub={topDevice ? `${topDevice[1]} clicks` : undefined}
              />
              <StatCard
                label="Top Browser"
                value={topBrowser?.[0] || "—"}
                sub={topBrowser ? `${topBrowser[1]} clicks` : undefined}
              />
              <StatCard
                label="Top OS"
                value={topOS?.[0] || "—"}
                sub={topOS ? `${topOS[1]} clicks` : undefined}
              />
            </div>

            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-3">
                Clicks by Day
              </h4>
              <BarChart data={analytics.clicksByDay} color="bg-emerald-500" />
            </div>

            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-3">
                Clicks by Hour
              </h4>
              <BarChart data={analytics.clicksByHour} color="bg-amber-500" />
            </div>
          </div>
        )}

        {tab === "devices" && (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-3">
                Device Types
              </h4>
              <BarChart data={analytics.devices} color="bg-blue-500" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-3">
                Operating Systems
              </h4>
              <BarChart
                data={analytics.operatingSystems}
                color="bg-purple-500"
              />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-3">
                Screen Resolutions
              </h4>
              <BarChart
                data={analytics.screenResolutions}
                color="bg-cyan-500"
              />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-3">
                Timezones
              </h4>
              <BarChart data={analytics.timezones} color="bg-pink-500" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-3">
                Languages
              </h4>
              <BarChart data={analytics.languages} color="bg-orange-500" />
            </div>
          </div>
        )}

        {tab === "browsers" && (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-3">
                Browsers
              </h4>
              <BarChart data={analytics.browsers} color="bg-green-500" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-3">
                Countries
              </h4>
              <BarChart data={analytics.countries} color="bg-yellow-500" />
            </div>
          </div>
        )}

        {tab === "sources" && (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-3">
                Referrers
              </h4>
              <BarChart data={analytics.referrers} color="bg-indigo-500" />
            </div>
          </div>
        )}

        {tab === "clicks" && (
          <div>
            <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-3">
              Recent Clicks ({analytics.recentClicks.length})
            </h4>
            {analytics.recentClicks.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">
                No clicks recorded yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-neutral-500 text-left border-b border-neutral-800">
                      <th className="pb-2 pr-4">Time</th>
                      <th className="pb-2 pr-4">Device</th>
                      <th className="pb-2 pr-4">Browser</th>
                      <th className="pb-2 pr-4">OS</th>
                      <th className="pb-2 pr-4">Referrer</th>
                      <th className="pb-2 pr-4">Screen</th>
                      <th className="pb-2">Country</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentClicks.map((click) => (
                      <tr
                        key={click.id}
                        className="border-b border-neutral-800/50 text-neutral-300"
                      >
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {new Date(click.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 capitalize">{click.device}</td>
                        <td className="py-2 pr-4">
                          {click.browser} {click.browserVersion}
                        </td>
                        <td className="py-2 pr-4">
                          {click.os} {click.osVersion}
                        </td>
                        <td className="py-2 pr-4 max-w-[150px] truncate">
                          {click.referrer}
                        </td>
                        <td className="py-2 pr-4">
                          {click.screenWidth}x{click.screenHeight}
                        </td>
                        <td className="py-2">{click.country}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CloakPage() {
  const [links, setLinks] = useState<CloakedLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingLinks, setFetchingLinks] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyticsSlug, setAnalyticsSlug] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);

  const [form, setForm] = useState({
    destinationUrl: "",
    slug: "",
    whitePageTitle: "Welcome",
    whitePageDescription: "Loading your content...",
    customDomain: "",
    password: "",
    expiryDate: "",
    maxClicks: 0,
    redirectDelay: 3,
    cloakType: "redirect" as "redirect" | "iframe" | "meta-refresh",
  });

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/links");
      const data = await res.json();
      setLinks(data.links || []);
    } catch {
      // silently fail
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
      resetForm();
    } catch {
      setError("Failed to create link");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      destinationUrl: "",
      slug: "",
      whitePageTitle: "Welcome",
      whitePageDescription: "Loading your content...",
      customDomain: "",
      password: "",
      expiryDate: "",
      maxClicks: 0,
      redirectDelay: 3,
      cloakType: "redirect",
    });
    setShowAdvanced(false);
    setEditSlug(null);
  };

  const handleDelete = async (slug: string) => {
    try {
      await fetch(`/api/links?slug=${slug}`, { method: "DELETE" });
      setLinks((prev) => prev.filter((l) => l.slug !== slug));
      if (analyticsSlug === slug) setAnalyticsSlug(null);
    } catch {
      // silently fail
    }
  };

  const handleToggle = async (slug: string) => {
    try {
      const res = await fetch(`/api/links?slug=${slug}&action=toggle`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (data.link) {
        setLinks((prev) =>
          prev.map((l) => (l.slug === slug ? data.link : l))
        );
      }
    } catch {
      // silently fail
    }
  };

  const handleEdit = (link: CloakedLink) => {
    setEditSlug(link.slug);
    setForm({
      destinationUrl: link.destinationUrl,
      slug: link.slug,
      whitePageTitle: link.whitePageTitle,
      whitePageDescription: link.whitePageDescription,
      customDomain: link.customDomain,
      password: link.password,
      expiryDate: link.expiryDate,
      maxClicks: link.maxClicks,
      redirectDelay: link.redirectDelay,
      cloakType: link.cloakType,
    });
    setShowAdvanced(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSlug) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/links?slug=${editSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationUrl: form.destinationUrl,
          whitePageTitle: form.whitePageTitle,
          whitePageDescription: form.whitePageDescription,
          customDomain: form.customDomain,
          password: form.password,
          expiryDate: form.expiryDate,
          maxClicks: form.maxClicks,
          redirectDelay: form.redirectDelay,
          cloakType: form.cloakType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update link");
        return;
      }

      setLinks((prev) =>
        prev.map((l) => (l.slug === editSlug ? data.link : l))
      );
      resetForm();
    } catch {
      setError("Failed to update link");
    } finally {
      setLoading(false);
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
            Create short URLs with custom white pages, analytics tracking,
            device detection, and more.
          </p>
        </header>

        <form
          onSubmit={editSlug ? handleUpdate : handleSubmit}
          className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-10"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">
              {editSlug ? "Edit Cloaked Link" : "Create Cloaked Link"}
            </h2>
            {editSlug && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-neutral-500 hover:text-white"
              >
                Cancel Edit
              </button>
            )}
          </div>

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
                Custom Slug {editSlug ? "" : "(optional)"}
              </label>
              <input
                type="text"
                placeholder="my-link (auto-generated if empty)"
                value={form.slug}
                disabled={!!editSlug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-neutral-500 hover:text-neutral-300 mb-4 flex items-center gap-1"
          >
            {showAdvanced ? "Hide" : "Show"} Advanced Options
            <svg
              className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Cloak Type
                </label>
                <select
                  value={form.cloakType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      cloakType: e.target.value as CloakedLink["cloakType"],
                    }))
                  }
                  className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="redirect">JavaScript Redirect</option>
                  <option value="meta-refresh">Meta Refresh</option>
                  <option value="iframe">iFrame Embed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Redirect Delay (seconds)
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={form.redirectDelay}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      redirectDelay: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Max Clicks (0 = unlimited)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.maxClicks}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxClicks: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Password Protection (optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty for no password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Expiry Date (optional)
                </label>
                <input
                  type="datetime-local"
                  value={form.expiryDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expiryDate: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              {loading
                ? editSlug
                  ? "Updating..."
                  : "Creating..."
                : editSlug
                  ? "Update Link"
                  : "Create Cloaked Link"}
            </button>
            {editSlug && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
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
                <div key={link.id}>
                  <div
                    className={`bg-neutral-900 border rounded-xl p-4 ${
                      link.isActive
                        ? "border-neutral-800"
                        : "border-red-900/30 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <code className="text-sm text-blue-400 font-mono truncate">
                            {getShortUrl(link)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(link)}
                            className="shrink-0 px-2 py-0.5 text-xs bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
                          >
                            {copiedSlug === link.slug ? "Copied!" : "Copy"}
                          </button>
                          <span
                            className={`shrink-0 px-2 py-0.5 text-xs rounded ${
                              link.isActive
                                ? "bg-green-500/10 text-green-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {link.isActive ? "Active" : "Inactive"}
                          </span>
                          {link.cloakType !== "redirect" && (
                            <span className="shrink-0 px-2 py-0.5 text-xs bg-neutral-800 text-neutral-400 rounded">
                              {link.cloakType}
                            </span>
                          )}
                          {link.maxClicks > 0 && (
                            <span className="shrink-0 px-2 py-0.5 text-xs bg-neutral-800 text-neutral-400 rounded">
                              {link.clicks}/{link.maxClicks} clicks
                            </span>
                          )}
                          {link.expiryDate && (
                            <span className="shrink-0 px-2 py-0.5 text-xs bg-neutral-800 text-neutral-400 rounded">
                              expires{" "}
                              {new Date(link.expiryDate).toLocaleDateString()}
                            </span>
                          )}
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
                          <span>{link.redirectDelay}s delay</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() =>
                            setAnalyticsSlug(
                              analyticsSlug === link.slug
                                ? null
                                : link.slug
                            )
                          }
                          className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                            analyticsSlug === link.slug
                              ? "bg-blue-500/20 text-blue-400"
                              : "text-neutral-400 hover:bg-neutral-800"
                          }`}
                        >
                          Stats
                        </button>
                        <button
                          onClick={() => handleEdit(link)}
                          className="px-2.5 py-1.5 text-xs text-neutral-400 hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(link.slug)}
                          className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                            link.isActive
                              ? "text-amber-400 hover:bg-amber-500/10"
                              : "text-green-400 hover:bg-green-500/10"
                          }`}
                        >
                          {link.isActive ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleDelete(link.slug)}
                          className="px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  {analyticsSlug === link.slug && (
                    <div className="mt-2">
                      <AnalyticsPanel
                        slug={link.slug}
                        onClose={() => setAnalyticsSlug(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
