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
  isBot: boolean;
  botType: string;
  verdict: string;
}

interface TrafficFilter {
  botMode: "block" | "redirect" | "allow";
  botRedirectUrl: string;
  allowedReferrers: string[];
  blockedReferrers: string[];
  allowedCountries: string[];
  blockedCountries: string[];
  allowedUserAgents: string[];
  blockedUserAgents: string[];
  requireJavaScript: boolean;
  captchaEnabled: boolean;
}

interface LinkAnalytics {
  totalClicks: number;
  realClicks: number;
  botClicks: number;
  blockedClicks: number;
  devices: Record<string, number>;
  browsers: Record<string, number>;
  operatingSystems: Record<string, number>;
  referrers: Record<string, number>;
  countries: Record<string, number>;
  botTypes: Record<string, number>;
  verdicts: Record<string, number>;
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
  trafficFilter: TrafficFilter;
  nicegramAdUrl: string;
}

interface Domain {
  id: string;
  domain: string;
  verified: boolean;
  createdAt: string;
  linkedSlug: string;
  sslEnabled: boolean;
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
  if (entries.length === 0)
    return <p className="text-xs text-neutral-500 italic">No data yet</p>;
  return (
    <div className="space-y-1.5">
      {entries.slice(0, 8).map(([label, value]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 w-28 truncate shrink-0">
            {label}
          </span>
          <div className="flex-1 h-4 bg-neutral-800 rounded overflow-hidden">
            <div
              className={`h-full ${color} rounded`}
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-neutral-300 w-8 text-right shrink-0">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsPanel({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [analytics, setAnalytics] = useState<LinkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "devices" | "bots" | "clicks">(
    "overview"
  );

  useEffect(() => {
    fetch(`/api/links?slug=${slug}&analytics=true`)
      .then((res) => res.json())
      .then((data) => {
        setAnalytics(data.analytics);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading)
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-center">
        <p className="text-neutral-400 text-sm">Loading analytics...</p>
      </div>
    );

  if (!analytics)
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-center">
        <p className="text-neutral-400 text-sm">No data</p>
        <button
          onClick={onClose}
          className="mt-2 text-xs text-neutral-500 hover:text-white"
        >
          Close
        </button>
      </div>
    );

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
        <h3 className="text-sm font-semibold">Analytics — /s/{slug}</h3>
        <button
          onClick={onClose}
          className="text-neutral-500 hover:text-white text-xs"
        >
          Close
        </button>
      </div>

      <div className="flex border-b border-neutral-800">
        {(["overview", "devices", "bots", "clicks"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
              tab === t
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-5">
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: "Total Clicks", v: analytics.totalClicks },
                { l: "Real Users", v: analytics.realClicks },
                { l: "Bot Clicks", v: analytics.botClicks },
                { l: "Blocked", v: analytics.blockedClicks },
              ].map((s) => (
                <div
                  key={s.l}
                  className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-3"
                >
                  <p className="text-xs text-neutral-500">{s.l}</p>
                  <p className="text-xl font-bold">{s.v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">
                Clicks by Day
              </p>
              <BarChart data={analytics.clicksByDay} color="bg-emerald-500" />
            </div>
          </>
        )}

        {tab === "devices" && (
          <>
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">
                Devices
              </p>
              <BarChart data={analytics.devices} color="bg-blue-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">
                Browsers
              </p>
              <BarChart data={analytics.browsers} color="bg-green-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">
                Operating Systems
              </p>
              <BarChart data={analytics.operatingSystems} color="bg-purple-500" />
            </div>
          </>
        )}

        {tab === "bots" && (
          <>
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">
                Bot Types Detected
              </p>
              <BarChart data={analytics.botTypes} color="bg-red-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">
                Traffic Verdicts
              </p>
              <BarChart data={analytics.verdicts} color="bg-amber-500" />
            </div>
          </>
        )}

        {tab === "clicks" && (
          <div className="overflow-x-auto">
            <p className="text-xs font-semibold text-neutral-400 uppercase mb-2">
              Recent Clicks ({analytics.recentClicks.length})
            </p>
            {analytics.recentClicks.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No clicks yet</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-neutral-500 text-left border-b border-neutral-800">
                    <th className="pb-2 pr-3">Time</th>
                    <th className="pb-2 pr-3">Device</th>
                    <th className="pb-2 pr-3">Browser</th>
                    <th className="pb-2 pr-3">OS</th>
                    <th className="pb-2 pr-3">Bot</th>
                    <th className="pb-2 pr-3">Verdict</th>
                    <th className="pb-2">Referrer</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentClicks.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-neutral-800/50 text-neutral-300"
                    >
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        {new Date(c.timestamp).toLocaleString()}
                      </td>
                      <td className="py-1.5 pr-3 capitalize">{c.device}</td>
                      <td className="py-1.5 pr-3">
                        {c.browser} {c.browserVersion}
                      </td>
                      <td className="py-1.5 pr-3">
                        {c.os} {c.osVersion}
                      </td>
                      <td className="py-1.5 pr-3">
                        {c.isBot ? (
                          <span className="text-red-400">{c.botType}</span>
                        ) : (
                          <span className="text-green-400">Real</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3">
                        <span
                          className={
                            c.verdict === "block"
                              ? "text-red-400"
                              : c.verdict === "suspicious"
                                ? "text-amber-400"
                                : "text-green-400"
                          }
                        >
                          {c.verdict}
                        </span>
                      </td>
                      <td className="py-1.5 max-w-[120px] truncate">
                        {c.referrer}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TrafficFilterEditor({
  filter,
  onChange,
}: {
  filter: TrafficFilter;
  onChange: (f: TrafficFilter) => void;
}) {
  const [newBlockedRef, setNewBlockedRef] = useState("");
  const [newAllowedRef, setNewAllowedRef] = useState("");
  const [newBlockedUA, setNewBlockedUA] = useState("");
  const [newAllowedUA, setNewAllowedUA] = useState("");

  const addItem = (
    field: keyof TrafficFilter,
    value: string,
    clear: (v: string) => void
  ) => {
    if (!value.trim()) return;
    const arr = [...(filter[field] as string[]), value.trim()];
    onChange({ ...filter, [field]: arr });
    clear("");
  };

  const removeItem = (field: keyof TrafficFilter, idx: number) => {
    const arr = [...(filter[field] as string[])];
    arr.splice(idx, 1);
    onChange({ ...filter, [field]: arr });
  };

  return (
    <div className="space-y-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
      <h4 className="text-sm font-semibold text-neutral-300">
        Traffic Filtering
      </h4>

      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1.5">
          Bot Handling
        </label>
        <select
          value={filter.botMode}
          onChange={(e) =>
            onChange({
              ...filter,
              botMode: e.target.value as TrafficFilter["botMode"],
            })
          }
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="block">Block Bots (show access denied)</option>
          <option value="redirect">Redirect Bots (to safe URL)</option>
          <option value="allow">Allow All (no filtering)</option>
        </select>
      </div>

      {filter.botMode === "redirect" && (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Bot Redirect URL
          </label>
          <input
            type="url"
            placeholder="https://safe-site.com"
            value={filter.botRedirectUrl}
            onChange={(e) =>
              onChange({ ...filter, botRedirectUrl: e.target.value })
            }
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Blocked Referrers
          </label>
          <div className="flex gap-1 mb-2">
            <input
              type="text"
              placeholder="e.g. spam-site.com"
              value={newBlockedRef}
              onChange={(e) => setNewBlockedRef(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                addItem("blockedReferrers", newBlockedRef, setNewBlockedRef)
              }
              className="flex-1 px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() =>
                addItem("blockedReferrers", newBlockedRef, setNewBlockedRef)
              }
              className="px-2 py-1.5 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/30"
            >
              Block
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {filter.blockedReferrers.map((r, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs flex items-center gap-1"
              >
                {r}
                <button
                  onClick={() => removeItem("blockedReferrers", i)}
                  className="hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Allowed Referrers
          </label>
          <div className="flex gap-1 mb-2">
            <input
              type="text"
              placeholder="e.g. my-site.com"
              value={newAllowedRef}
              onChange={(e) => setNewAllowedRef(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                addItem("allowedReferrers", newAllowedRef, setNewAllowedRef)
              }
              className="flex-1 px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() =>
                addItem("allowedReferrers", newAllowedRef, setNewAllowedRef)
              }
              className="px-2 py-1.5 bg-green-600/20 text-green-400 rounded text-xs hover:bg-green-600/30"
            >
              Allow
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {filter.allowedReferrers.map((r, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs flex items-center gap-1"
              >
                {r}
                <button
                  onClick={() => removeItem("allowedReferrers", i)}
                  className="hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Blocked User Agents
          </label>
          <div className="flex gap-1 mb-2">
            <input
              type="text"
              placeholder="e.g. curl, python"
              value={newBlockedUA}
              onChange={(e) => setNewBlockedUA(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                addItem("blockedUserAgents", newBlockedUA, setNewBlockedUA)
              }
              className="flex-1 px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() =>
                addItem("blockedUserAgents", newBlockedUA, setNewBlockedUA)
              }
              className="px-2 py-1.5 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/30"
            >
              Block
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {filter.blockedUserAgents.map((r, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs flex items-center gap-1"
              >
                {r}
                <button
                  onClick={() => removeItem("blockedUserAgents", i)}
                  className="hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Allowed User Agents
          </label>
          <div className="flex gap-1 mb-2">
            <input
              type="text"
              placeholder="e.g. Chrome, Mozilla"
              value={newAllowedUA}
              onChange={(e) => setNewAllowedUA(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                addItem("allowedUserAgents", newAllowedUA, setNewAllowedUA)
              }
              className="flex-1 px-2 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() =>
                addItem("allowedUserAgents", newAllowedUA, setNewAllowedUA)
              }
              className="px-2 py-1.5 bg-green-600/20 text-green-400 rounded text-xs hover:bg-green-600/30"
            >
              Allow
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {filter.allowedUserAgents.map((r, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs flex items-center gap-1"
              >
                {r}
                <button
                  onClick={() => removeItem("allowedUserAgents", i)}
                  className="hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DomainManager({ links }: { links: CloakedLink[] }) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [linkedSlug, setLinkedSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationInfo, setVerificationInfo] = useState<Record<string, string>>({});

  const fetchDomains = useCallback(() => {
    fetch("/api/domains")
      .then((r) => r.json())
      .then((d) => setDomains(d.domains || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain || !linkedSlug) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain, linkedSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add domain");
        return;
      }
      setVerificationInfo((prev) => ({
        ...prev,
        [data.domain.domain]: data.verificationCode,
      }));
      setDomains((prev) => [data.domain, ...prev]);
      setNewDomain("");
      setLinkedSlug("");
    } catch {
      setError("Failed to add domain");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (domain: string) => {
    try {
      const code = verificationInfo[domain] || "";
      const res = await fetch(`/api/domains?domain=${domain}&action=verify`, {
        method: "PATCH",
        headers: { "x-verification-check": code },
      });
      const data = await res.json();
      if (data.verified) {
        setDomains((prev) =>
          prev.map((d) => (d.domain === domain ? { ...d, verified: true } : d))
        );
      }
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (domain: string) => {
    try {
      await fetch(`/api/domains?domain=${domain}`, { method: "DELETE" });
      setDomains((prev) => prev.filter((d) => d.domain !== domain));
    } catch {
      // silently fail
    }
  };

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4">Custom Domains</h2>
      <p className="text-xs text-neutral-500 mb-4">
        Add your own domains to use for cloaked links. Point your domain&apos;s
        DNS to this server, then verify ownership.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="yourdomain.com"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500"
        />
        <select
          value={linkedSlug}
          onChange={(e) => setLinkedSlug(e.target.value)}
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">Select a link...</option>
          {links.map((l) => (
            <option key={l.slug} value={l.slug}>
              /s/{l.slug} — {l.whitePageTitle}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading || !newDomain || !linkedSlug}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? "Adding..." : "Add Domain"}
        </button>
      </form>

      {domains.length === 0 ? (
        <p className="text-xs text-neutral-600 text-center py-4">
          No custom domains added yet.
        </p>
      ) : (
        <div className="space-y-2">
          {domains.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 p-3 bg-neutral-800/50 border border-neutral-700/50 rounded-lg"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-sm text-blue-400 font-mono">
                    {d.domain}
                  </code>
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      d.verified
                        ? "bg-green-500/10 text-green-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {d.verified ? "Verified" : "Pending"}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  → /s/{d.linkedSlug}
                  {!d.verified && verificationInfo[d.domain] && (
                    <span className="ml-2 text-neutral-600">
                      TXT: cloak-verify={verificationInfo[d.domain]}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!d.verified && (
                  <button
                    onClick={() => handleVerify(d.domain)}
                    className="px-3 py-1 text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded transition-colors"
                  >
                    Verify
                  </button>
                )}
                <button
                  onClick={() => handleDelete(d.domain)}
                  className="px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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
  const [showTraffic, setShowTraffic] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"links" | "domains">("links");

  const defaultFilter: TrafficFilter = {
    botMode: "block",
    botRedirectUrl: "",
    allowedReferrers: [],
    blockedReferrers: [],
    allowedCountries: [],
    blockedCountries: [],
    allowedUserAgents: [],
    blockedUserAgents: [],
    requireJavaScript: true,
    captchaEnabled: false,
  };

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
    trafficFilter: defaultFilter,
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
      trafficFilter: defaultFilter,
    });
    setShowAdvanced(false);
    setShowTraffic(false);
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
        setLinks((prev) => prev.map((l) => (l.slug === slug ? data.link : l)));
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
      trafficFilter: link.trafficFilter || defaultFilter,
    });
    setShowAdvanced(true);
    setShowTraffic(true);
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
        body: JSON.stringify(form),
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

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSlug(key);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Link Cloaking</h1>
          <p className="text-neutral-400 text-sm">
            Custom domains, bot blocking, Nicegram ad URLs, and full analytics.
          </p>
        </header>

        <div className="flex gap-2 mb-8 border-b border-neutral-800">
          {(["links", "domains"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                activeTab === t
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {t === "links" ? "Cloaked Links" : "Custom Domains"}
            </button>
          ))}
        </div>

        {activeTab === "domains" && <DomainManager links={links} />}

        {activeTab === "links" && (
          <>
            <form
              onSubmit={editSlug ? handleUpdate : handleSubmit}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold">
                  {editSlug ? "Edit Link" : "Create Cloaked Link"}
                </h2>
                {editSlug && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-neutral-500 hover:text-white"
                  >
                    Cancel
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
                    placeholder="https://example.com/your-link"
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
                    placeholder="auto-generated if empty"
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
                className="text-xs text-neutral-500 hover:text-neutral-300 mb-3 flex items-center gap-1"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Cloak Type
                    </label>
                    <select
                      value={form.cloakType}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          cloakType: e.target.value as
                            | "redirect"
                            | "iframe"
                            | "meta-refresh",
                        }))
                      }
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="redirect">JavaScript Redirect</option>
                      <option value="meta-refresh">Meta Refresh</option>
                      <option value="iframe">iFrame Embed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
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
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
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
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Password (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="No password"
                      value={form.password}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, password: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Expiry Date (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={form.expiryDate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, expiryDate: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowTraffic(!showTraffic)}
                className="text-xs text-neutral-500 hover:text-neutral-300 mb-3 flex items-center gap-1"
              >
                {showTraffic ? "Hide" : "Show"} Traffic Filtering
                <svg
                  className={`w-3 h-3 transition-transform ${showTraffic ? "rotate-180" : ""}`}
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

              {showTraffic && (
                <div className="mb-5">
                  <TrafficFilterEditor
                    filter={form.trafficFilter}
                    onChange={(tf) =>
                      setForm((f) => ({ ...f, trafficFilter: tf }))
                    }
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
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
                    className="px-6 py-2.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm font-medium"
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
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <code className="text-sm text-blue-400 font-mono">
                                {getShortUrl(link)}
                              </code>
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    getShortUrl(link),
                                    `url-${link.slug}`
                                  )
                                }
                                className="px-2 py-0.5 text-xs bg-neutral-800 hover:bg-neutral-700 rounded"
                              >
                                {copiedSlug === `url-${link.slug}`
                                  ? "Copied!"
                                  : "Copy URL"}
                              </button>
                              <span
                                className={`px-2 py-0.5 text-xs rounded ${
                                  link.isActive
                                    ? "bg-green-500/10 text-green-400"
                                    : "bg-red-500/10 text-red-400"
                                }`}
                              >
                                {link.isActive ? "Active" : "Inactive"}
                              </span>
                              {link.trafficFilter?.botMode === "block" && (
                                <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 rounded">
                                  Bot Block
                                </span>
                              )}
                              {link.trafficFilter?.botMode === "redirect" && (
                                <span className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-400 rounded">
                                  Bot Redirect
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-neutral-500 truncate mb-1">
                              → {link.destinationUrl}
                            </p>

                            <div className="flex items-center gap-3 text-xs text-neutral-600 flex-wrap">
                              <span>{link.whitePageTitle}</span>
                              <span>{link.clicks} clicks</span>
                              <span>
                                {new Date(link.createdAt).toLocaleDateString()}
                              </span>
                              <span>{link.redirectDelay}s delay</span>
                              {link.maxClicks > 0 && (
                                <span>
                                  {link.clicks}/{link.maxClicks} limit
                                </span>
                              )}
                            </div>

                            {link.nicegramAdUrl && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-neutral-600">
                                  Nicegram Ad:
                                </span>
                                <code className="text-xs text-purple-400 font-mono truncate max-w-[300px]">
                                  {link.nicegramAdUrl}
                                </code>
                                <button
                                  onClick={() =>
                                    copyToClipboard(
                                      link.nicegramAdUrl,
                                      `nicegram-${link.slug}`
                                    )
                                  }
                                  className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded"
                                >
                                  {copiedSlug === `nicegram-${link.slug}`
                                    ? "Copied!"
                                    : "Copy Ad URL"}
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
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
                              className="px-2.5 py-1.5 text-xs text-neutral-400 hover:bg-neutral-800 rounded-lg"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggle(link.slug)}
                              className={`px-2.5 py-1.5 text-xs rounded-lg ${
                                link.isActive
                                  ? "text-amber-400 hover:bg-amber-500/10"
                                  : "text-green-400 hover:bg-green-500/10"
                              }`}
                            >
                              {link.isActive ? "Disable" : "Enable"}
                            </button>
                            <button
                              onClick={() => handleDelete(link.slug)}
                              className="px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg"
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
          </>
        )}
      </div>
    </main>
  );
}
