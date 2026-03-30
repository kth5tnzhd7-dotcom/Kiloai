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
  verificationCode: string;
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
  const [success, setSuccess] = useState("");
  const [verifying, setVerifying] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<string | null>(null);

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
    setSuccess("");
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
      setDomains((prev) => [data.domain, ...prev]);
      setNewDomain("");
      setLinkedSlug("");
      setSuccess(`Domain "${data.domain.domain}" added! Add the TXT record below to verify.`);
      setShowInstructions(data.domain.domain);
      setTimeout(() => setSuccess(""), 5000);
    } catch {
      setError("Failed to add domain");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (domain: string) => {
    setVerifying(domain);
    setError("");
    try {
      const res = await fetch(`/api/domains?domain=${domain}&action=verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.verified) {
        setDomains((prev) =>
          prev.map((d) => (d.domain === domain ? { ...d, verified: true } : d))
        );
        setSuccess(`Domain "${domain}" verified successfully!`);
        setShowInstructions(null);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message || "Verification failed. Make sure you added the TXT record.");
      }
    } catch {
      setError("Verification failed");
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async (domain: string) => {
    try {
      await fetch(`/api/domains?domain=${domain}`, { method: "DELETE" });
      setDomains((prev) => prev.filter((d) => d.domain !== domain));
      if (showInstructions === domain) setShowInstructions(null);
    } catch {
      // silently fail
    }
  };

  const copyCode = (code: string, domain: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(domain);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8">
      <h2 className="text-lg font-semibold mb-1">Custom Domains</h2>
      <p className="text-xs text-neutral-500 mb-5">
        Add your own domains for cloaked links. Each domain gets a unique verification code
        — add it as a DNS TXT record, then click Verify.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1">
          <input
            type="text"
            required
            placeholder="yourdomain.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={linkedSlug}
          onChange={(e) => setLinkedSlug(e.target.value)}
          className="px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">No link (can assign later)</option>
          {links.map((l) => (
            <option key={l.slug} value={l.slug}>
              /s/{l.slug} — {l.whitePageTitle}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading || !newDomain}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          {loading ? "Adding..." : "Create Domain"}
        </button>
      </form>

      {domains.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-neutral-700 rounded-lg">
          <p className="text-sm text-neutral-500 mb-1">No custom domains yet</p>
          <p className="text-xs text-neutral-600">
            Add a domain above to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => (
            <div key={d.id} className="border border-neutral-700/50 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-4 bg-neutral-800/30">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm text-blue-400 font-mono font-semibold">
                      {d.domain}
                    </code>
                    <span
                      className={`px-2 py-0.5 text-xs rounded font-medium ${
                        d.verified
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {d.verified ? "Verified" : "Pending Verification"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <span>Links to: /s/{d.linkedSlug}</span>
                    <span>Added: {new Date(d.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!d.verified && (
                    <button
                      onClick={() => handleVerify(d.domain)}
                      disabled={verifying === d.domain}
                      className="px-3 py-1.5 text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded transition-colors disabled:opacity-50"
                    >
                      {verifying === d.domain ? "Verifying..." : "Verify Now"}
                    </button>
                  )}
                  {d.verified && (
                    <button
                      onClick={() =>
                        setShowInstructions(
                          showInstructions === d.domain ? null : d.domain
                        )
                      }
                      className="px-3 py-1.5 text-xs bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded transition-colors"
                    >
                      {showInstructions === d.domain ? "Hide Info" : "View Info"}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(d.domain)}
                    className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {!d.verified && (
                <div className="p-4 bg-neutral-900/50 border-t border-neutral-700/50 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-300 mb-2">
                      DNS Verification Instructions
                    </h4>
                    <ol className="text-xs text-neutral-400 space-y-1.5 list-decimal list-inside">
                      <li>Go to your domain&apos;s DNS settings (GoDaddy, Cloudflare, Namecheap, etc.)</li>
                      <li>Add a new <span className="text-blue-400 font-semibold">TXT</span> record</li>
                      <li>Set the <span className="text-neutral-300 font-medium">Name/Host</span> to <code className="text-blue-400">@</code> or your domain</li>
                      <li>Set the <span className="text-neutral-300 font-medium">Value</span> to the code below</li>
                      <li>Save and wait a few minutes for DNS propagation</li>
                      <li>Click <span className="text-amber-400 font-medium">Verify Now</span> above</li>
                    </ol>
                  </div>

                  <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
                    <p className="text-xs text-neutral-500 mb-2">TXT Record Value:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm text-green-400 font-mono bg-neutral-900 px-3 py-2 rounded border border-neutral-700 break-all">
                        {d.verificationCode}
                      </code>
                      <button
                        onClick={() => copyCode(d.verificationCode, d.domain)}
                        className="shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                      >
                        {copiedCode === d.domain ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="bg-neutral-800/50 border border-neutral-700/30 rounded-lg p-3">
                    <p className="text-xs text-neutral-500 mb-1">Quick Setup Examples:</p>
                    <div className="space-y-2 text-xs text-neutral-400">
                      <div>
                        <span className="text-neutral-500">Cloudflare:</span>{" "}
                        DNS → Add Record → Type: TXT → Name: @ → Content:{" "}
                        <code className="text-green-400">{d.verificationCode}</code>
                      </div>
                      <div>
                        <span className="text-neutral-500">GoDaddy:</span>{" "}
                        DNS Management → Add → Type: TXT → Host: @ → TXT Value:{" "}
                        <code className="text-green-400">{d.verificationCode}</code>
                      </div>
                      <div>
                        <span className="text-neutral-500">Namecheap:</span>{" "}
                        Advanced DNS → Add Record → Type: TXT → Host: @ → Value:{" "}
                        <code className="text-green-400">{d.verificationCode}</code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {d.verified && (
                <div className="p-3 bg-green-500/5 border-t border-green-500/10">
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Domain verified and active. Visitors to{" "}
                    <code className="font-mono font-semibold">https://{d.domain}/s/{d.linkedSlug}</code>{" "}
                    will see your white page.
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ZipUploadManager() {
  const [file, setFile] = useState<File | null>(null);
  const [scriptHead, setScriptHead] = useState("");
  const [scriptBodyStart, setScriptBodyStart] = useState("");
  const [scriptBodyEnd, setScriptBodyEnd] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    fileName: string;
    fileCount: number;
    originalSize: number;
    processedSize: number;
  } | null>(null);
  const [projects, setProjects] = useState<
    { id: string; name: string; createdAt: string; files: Record<string, string> }[]
  >([]);

  const fetchProjects = useCallback(() => {
    fetch("/api/upload")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("scriptHead", scriptHead);
      formData.append("scriptBodyStart", scriptBodyStart);
      formData.append("scriptBodyEnd", scriptBodyEnd);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Upload failed");
        return;
      }

      const fileName = `${file.name.replace(".zip", "")}-processed.zip`;
      const fileCount = parseInt(res.headers.get("X-File-Count") || "0");
      const originalSize = parseInt(res.headers.get("X-Original-Size") || "0");
      const processedSize = parseInt(res.headers.get("X-Processed-Size") || "0");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      setResult({ fileName, fileCount, originalSize, processedSize });
      setFile(null);
      fetchProjects();
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/upload?id=${id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // silently fail
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <section className="space-y-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-1">ZIP File Upload & Script Injection</h2>
        <p className="text-xs text-neutral-500 mb-5">
          Upload a ZIP file containing your website. CDN scripts and tracking codes
          will be auto-injected into all HTML files at 3 locations.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm space-y-1">
            <p className="font-semibold">Processed successfully!</p>
            <p className="text-xs">
              {result.fileCount} files | {formatBytes(result.originalSize)} →{" "}
              {formatBytes(result.processedSize)} | Downloaded as {result.fileName}
            </p>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Upload ZIP File *
            </label>
            <input
              type="file"
              accept=".zip"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm file:mr-3 file:py-1 file:px-3 file:bg-neutral-700 file:text-white file:border-0 file:rounded file:text-xs file:cursor-pointer focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 rounded font-medium">
                  &lt;/head&gt;
                </span>
                <label className="text-sm font-medium text-neutral-300">
                  Inject Before Closing Head Tag
                </label>
              </div>
              <p className="text-xs text-neutral-500 mb-2">
                CDN links, meta tags, CSS — injected right before &lt;/head&gt;
              </p>
              <textarea
                placeholder={`<link rel="stylesheet" href="https://cdn.example.com/style.css">\n<meta name="analytics" content="UA-XXXXX">`}
                value={scriptHead}
                onChange={(e) => setScriptHead(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-xs font-mono placeholder-neutral-600 focus:outline-none focus:border-blue-500 resize-y"
              />
            </div>

            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 rounded font-medium">
                  &lt;body&gt;
                </span>
                <label className="text-sm font-medium text-neutral-300">
                  Inject After Opening Body Tag
                </label>
              </div>
              <p className="text-xs text-neutral-500 mb-2">
                Top banners, GTM noscript — injected right after &lt;body&gt;
              </p>
              <textarea
                placeholder={`<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXX"></iframe></noscript>`}
                value={scriptBodyStart}
                onChange={(e) => setScriptBodyStart(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-xs font-mono placeholder-neutral-600 focus:outline-none focus:border-blue-500 resize-y"
              />
            </div>

            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-400 rounded font-medium">
                  &lt;/body&gt;
                </span>
                <label className="text-sm font-medium text-neutral-300">
                  Inject Before Closing Body Tag
                </label>
              </div>
              <p className="text-xs text-neutral-500 mb-2">
                JS scripts, analytics, chat widgets — injected right before &lt;/body&gt;
              </p>
              <textarea
                placeholder={`<script src="https://cdn.example.com/app.js"></script>\n<script>console.log("injected");</script>`}
                value={scriptBodyEnd}
                onChange={(e) => setScriptBodyEnd(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-xs font-mono placeholder-neutral-600 focus:outline-none focus:border-blue-500 resize-y"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {uploading ? "Processing..." : "Upload & Inject Scripts"}
          </button>
        </form>
      </div>

      {projects.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-3">
            Recent Uploads ({projects.length})
          </h3>
          <div className="space-y-2">
            {projects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-3 bg-neutral-800/30 border border-neutral-700/50 rounded-lg"
              >
                <div>
                  <p className="text-sm text-neutral-300 font-medium">
                    {p.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {Object.keys(p.files).length} files |{" "}
                    {new Date(p.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-xs text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function WebsiteCloner() {
  const [url, setUrl] = useState("");
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    fileName: string;
    fileCount: number;
    totalSize: number;
    files: { path: string; size: number; type: string }[];
  } | null>(null);

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setCloning(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to clone website");
        return;
      }

      const fileCount = parseInt(res.headers.get("X-File-Count") || "0");
      const totalSize = parseInt(res.headers.get("X-Total-Size") || "0");

      let domain = "website";
      try {
        const u = new URL(url.startsWith("http") ? url : "https://" + url);
        domain = u.hostname;
      } catch {
        // use default
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${domain}.zip`;
      a.click();
      URL.revokeObjectURL(downloadUrl);

      const cloneId = res.headers.get("X-Clone-Id") || "";

      setResult({
        fileName: `${domain}.zip`,
        fileCount,
        totalSize,
        files: [],
      });

      if (cloneId) {
        setTimeout(() => {
          fetch("/api/clone")
            .then((r) => r.json())
            .then((d) => {
              const clone = d.clones?.find(
                (c: { id: string }) => c.id === cloneId
              );
              if (clone) {
                setResult((prev) =>
                  prev ? { ...prev, files: clone.files } : null
                );
              }
            })
            .catch(() => {});
        }, 500);
      }
    } catch {
      setError("Failed to clone website");
    } finally {
      setCloning(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const getFileIcon = (path: string) => {
    if (path.endsWith(".html") || path.endsWith(".htm")) return "HTML";
    if (path.endsWith(".css")) return "CSS";
    if (path.endsWith(".js")) return "JS";
    if (
      path.endsWith(".png") ||
      path.endsWith(".jpg") ||
      path.endsWith(".gif") ||
      path.endsWith(".svg") ||
      path.endsWith(".webp")
    )
      return "IMG";
    if (path.endsWith(".woff") || path.endsWith(".woff2") || path.endsWith(".ttf"))
      return "FONT";
    if (path.endsWith(".json")) return "JSON";
    if (path.endsWith(".xml")) return "XML";
    return "FILE";
  };

  return (
    <section className="space-y-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-1">Website Cloner</h2>
        <p className="text-xs text-neutral-500 mb-5">
          Enter any website URL to download it as a ZIP. All HTML, CSS, JS, images,
          and fonts will be fetched with local paths rewritten.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleClone} className="flex gap-3 mb-6">
          <input
            type="text"
            required
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={cloning || !url}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            {cloning ? (
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Cloning...
              </span>
            ) : (
              "Clone & Download"
            )}
          </button>
        </form>

        <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase mb-3">
            What gets cloned
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "HTML Pages", desc: "index.html, pages", icon: "HTML" },
              { label: "CSS Styles", desc: "stylesheets, fonts", icon: "CSS" },
              { label: "JavaScript", desc: "scripts, libraries", icon: "JS" },
              { label: "Images", desc: "png, jpg, svg, webp", icon: "IMG" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 p-2 bg-neutral-800 rounded"
              >
                <span
                  className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded ${
                    item.icon === "HTML"
                      ? "bg-orange-500/20 text-orange-400"
                      : item.icon === "CSS"
                        ? "bg-blue-500/20 text-blue-400"
                        : item.icon === "JS"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-green-500/20 text-green-400"
                  }`}
                >
                  {item.icon}
                </span>
                <div>
                  <p className="text-xs text-neutral-300 font-medium">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-neutral-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">
              Cloned: {result.fileName}
            </h3>
            <span className="text-xs text-neutral-500">
              {result.fileCount} files | {formatBytes(result.totalSize)}
            </span>
          </div>

          {result.files.length > 0 && (
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-neutral-900">
                  <tr className="text-neutral-500 text-left border-b border-neutral-800">
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3">File Path</th>
                    <th className="pb-2 text-right">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {result.files.map((f, i) => (
                    <tr
                      key={i}
                      className="border-b border-neutral-800/50 text-neutral-300"
                    >
                      <td className="py-1.5 pr-3">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                            getFileIcon(f.path) === "HTML"
                              ? "bg-orange-500/20 text-orange-400"
                              : getFileIcon(f.path) === "CSS"
                                ? "bg-blue-500/20 text-blue-400"
                                : getFileIcon(f.path) === "JS"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : getFileIcon(f.path) === "IMG"
                                    ? "bg-green-500/20 text-green-400"
                                    : getFileIcon(f.path) === "FONT"
                                      ? "bg-purple-500/20 text-purple-400"
                                      : getFileIcon(f.path) === "JSON"
                                        ? "bg-cyan-500/20 text-cyan-400"
                                        : "bg-neutral-700 text-neutral-400"
                          }`}
                        >
                          {getFileIcon(f.path)}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 font-mono truncate max-w-[300px]">
                        {f.path}
                      </td>
                      <td className="py-1.5 text-right text-neutral-500">
                        {formatBytes(f.size)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-green-400">
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>
                ZIP downloaded! Open <code className="font-mono font-semibold">index.html</code> in
                your browser to view the cloned site offline.
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-3">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: "1",
              title: "Enter URL",
              desc: "Paste any website URL you want to download",
            },
            {
              step: "2",
              title: "Auto Crawl",
              desc: "Fetches HTML, CSS, JS, images, fonts up to 100 files",
            },
            {
              step: "3",
              title: "Download ZIP",
              desc: "All files with rewritten local paths, ready to use offline",
            },
          ].map((s) => (
            <div key={s.step} className="flex gap-3">
              <div className="shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                {s.step}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-200">
                  {s.title}
                </p>
                <p className="text-xs text-neutral-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DeployManager() {
  const [deployments, setDeployments] = useState<
    {
      id: string;
      name: string;
      fileCount: number;
      deployUrl: string;
      status: string;
      linkedSlug: string;
      createdAt: string;
      cpanelUrl: string;
    }[]
  >([]);
  const [file, setFile] = useState<File | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [cpanelUrl, setCpanelUrl] = useState("");
  const [cpanelUser, setCpanelUser] = useState("");
  const [cpanelToken, setCpanelToken] = useState("");
  const [cpanelDir, setCpanelDir] = useState("public_html");
  const [manualUrl, setManualUrl] = useState("");
  const [mode, setMode] = useState<"cpanel" | "manual">("cpanel");

  const fetchDeployments = useCallback(() => {
    fetch("/api/deploy")
      .then((r) => r.json())
      .then((d) => setDeployments(d.deployments || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeploying(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "manual") {
        if (!manualUrl) {
          setError("Please enter a URL");
          setDeploying(false);
          return;
        }
        const res = await fetch("/api/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "manual-deploy",
            deployUrl: manualUrl,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed");
          return;
        }
        setSuccess(`URL saved! Temp URL: ${data.deployment.deployUrl || manualUrl}`);
        setManualUrl("");
        fetchDeployments();
        return;
      }

      if (!file || !cpanelUrl || !cpanelUser || !cpanelToken) {
        setError("All cPanel fields and ZIP file are required");
        setDeploying(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("cpanelUrl", cpanelUrl);
      formData.append("cpanelUsername", cpanelUser);
      formData.append("cpanelToken", cpanelToken);
      formData.append("cpanelDir", cpanelDir);
      formData.append("name", file.name.replace(".zip", ""));

      const res = await fetch("/api/deploy", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Deployment failed");
        return;
      }

      setSuccess(
        `Deployed! Temp URL: ${data.deployment.deployUrl}`
      );
      setFile(null);
      fetchDeployments();
    } catch {
      setError("Deployment failed");
    } finally {
      setDeploying(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/deploy?id=${id}`, { method: "DELETE" });
      setDeployments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // silently fail
    }
  };

  const handleLinkToCloak = (deployUrl: string) => {
    navigator.clipboard.writeText(deployUrl);
    setSuccess("Temp URL copied! Paste it as destination URL in Cloaked Links tab.");
    setTimeout(() => setSuccess(""), 4000);
  };

  return (
    <section className="space-y-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-1">Deploy & Temp URLs</h2>
        <p className="text-xs text-neutral-500 mb-5">
          Deploy ZIP files to your cPanel hosting and get temp URLs for cloaking.
          Or add a manual URL to use as your cloaked destination.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setMode("cpanel")}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              mode === "cpanel"
                ? "bg-blue-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            cPanel Deploy
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              mode === "manual"
                ? "bg-blue-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Add Manual URL
          </button>
        </div>

        <form onSubmit={handleDeploy} className="space-y-4">
          {mode === "cpanel" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  ZIP File *
                </label>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm file:mr-3 file:py-1 file:px-3 file:bg-neutral-700 file:text-white file:border-0 file:rounded file:text-xs file:cursor-pointer focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    cPanel URL *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://yourserver.com:2083"
                    value={cpanelUrl}
                    onChange={(e) => setCpanelUrl(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cpanel_username"
                    value={cpanelUser}
                    onChange={(e) => setCpanelUser(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    API Token *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="cPanel API token"
                    value={cpanelToken}
                    onChange={(e) => setCpanelToken(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Deploy Directory
                  </label>
                  <input
                    type="text"
                    placeholder="public_html"
                    value={cpanelDir}
                    onChange={(e) => setCpanelDir(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-3">
                <p className="text-xs text-neutral-500 mb-1">
                  How to get cPanel API Token:
                </p>
                <ol className="text-xs text-neutral-400 space-y-1 list-decimal list-inside">
                  <li>Login to your cPanel</li>
                  <li>Go to Manage API Tokens (under Security)</li>
                  <li>Create a new token and copy it</li>
                  <li>Enter your cPanel URL, username, and token above</li>
                </ol>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Deployed URL *
              </label>
              <input
                type="url"
                required
                placeholder="https://your-hosted-site.com"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Paste a URL where your white page is already hosted
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={deploying}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {deploying
              ? "Deploying..."
              : mode === "cpanel"
                ? "Deploy to cPanel"
                : "Save URL"}
          </button>
        </form>
      </div>

      {deployments.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-3">
            Deployments ({deployments.length})
          </h3>
          <div className="space-y-2">
            {deployments.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 p-3 bg-neutral-800/30 border border-neutral-700/50 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-neutral-300 font-medium">
                      {d.name}
                    </p>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        d.status === "deployed"
                          ? "bg-green-500/10 text-green-400"
                          : d.status === "failed"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  {d.deployUrl && (
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-blue-400 font-mono truncate max-w-[350px]">
                        {d.deployUrl}
                      </code>
                      <button
                        onClick={() => handleLinkToCloak(d.deployUrl)}
                        className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded transition-colors shrink-0"
                      >
                        Copy for Cloak
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {d.fileCount} files |{" "}
                    {new Date(d.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="text-xs text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded transition-colors shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-3">Workflow</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              step: "1",
              title: "Clone Website",
              desc: "Use Site Cloner tab to download any site as ZIP",
            },
            {
              step: "2",
              title: "Deploy to cPanel",
              desc: "Upload ZIP with cPanel credentials to get temp URL",
            },
            {
              step: "3",
              title: "Copy Temp URL",
              desc: 'Click "Copy for Cloak" to copy the deployed URL',
            },
            {
              step: "4",
              title: "Create Cloaked Link",
              desc: "Paste temp URL as destination in Cloaked Links tab",
            },
          ].map((s) => (
            <div key={s.step} className="flex gap-3">
              <div className="shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                {s.step}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-200">
                  {s.title}
                </p>
                <p className="text-xs text-neutral-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
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
  const [activeTab, setActiveTab] = useState<"links" | "domains" | "uploads" | "cloner" | "deploy">("links");

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

        <div className="flex gap-2 mb-8 border-b border-neutral-800 overflow-x-auto">
          {(["links", "domains", "uploads", "cloner", "deploy"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                activeTab === t
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {t === "links"
                ? "Cloaked Links"
                : t === "domains"
                  ? "Custom Domains"
                  : t === "uploads"
                    ? "ZIP Upload"
                    : t === "cloner"
                      ? "Site Cloner"
                      : "Deploy"}
            </button>
          ))}
        </div>

        {activeTab === "domains" && <DomainManager links={links} />}

        {activeTab === "uploads" && <ZipUploadManager />}

        {activeTab === "cloner" && <WebsiteCloner />}

        {activeTab === "deploy" && <DeployManager />}

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
