"use client";

import { useEffect, useState } from "react";
import { collectAnalytics } from "@/lib/detect";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface LinkData {
  slug: string;
  destinationUrl: string;
  whitePageTitle: string;
  whitePageDescription: string;
  customDomain: string;
  redirectDelay: number;
  cloakType: string;
  isActive: boolean;
  trafficFilter: {
    botMode: string;
    botRedirectUrl: string;
    requireJavaScript: boolean;
  };
}

type PageState = "loading" | "redirecting" | "blocked" | "not-found" | "inactive";

export default function CloakedPage({ params }: PageProps) {
  const [link, setLink] = useState<LinkData | null>(null);
  const [state, setState] = useState<PageState>("loading");
  const [blockReason, setBlockReason] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [botDetected, setBotDetected] = useState(false);

  useEffect(() => {
    params.then(({ slug }) => {
      fetch(`/api/links?slug=${slug}`)
        .then((res) => {
          if (!res.ok) {
            setState("not-found");
            throw new Error();
          }
          return res.json();
        })
        .then((data) => {
          if (!data.link) {
            setState("not-found");
            return;
          }
          if (!data.link.isActive) {
            setState("inactive");
            return;
          }

          setLink(data.link);
          setCountdown(data.link.redirectDelay ?? 3);

          const analytics = collectAnalytics();

          const ua = navigator.userAgent;
          const headers: Record<string, string> = {
            "user-agent": ua,
            "accept-language": navigator.language,
          };

          const checkResult = {
            device: analytics.device,
            browser: analytics.browser,
            browserVersion: analytics.browserVersion,
            os: analytics.os,
            osVersion: analytics.osVersion,
            referrer: analytics.referrer || document.referrer,
            language: analytics.language,
            screenWidth: analytics.screenWidth,
            screenHeight: analytics.screenHeight,
            timezone: analytics.timezone,
          };

          fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, ...checkResult }),
            keepalive: true,
          })
            .then((res) => res.json())
            .then((trackData) => {
              if (trackData.blocked) {
                setBotDetected(true);
                setBlockReason(trackData.reason || "Traffic blocked");
                setState("blocked");
                return;
              }

              if (trackData.redirect) {
                window.location.href = trackData.redirect;
                return;
              }

              setState("redirecting");
            })
            .catch(() => {
              setState("redirecting");
            });
        })
        .catch(() => {
          if (state === "loading") setState("not-found");
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state !== "redirecting" || !link) return;

    if (countdown <= 0) {
      if (link.cloakType !== "iframe") {
        window.location.href = link.destinationUrl;
      }
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [state, link, countdown]);

  useEffect(() => {
    if (link && state === "redirecting") {
      document.title = link.whitePageTitle;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", link.whitePageDescription);
      } else {
        const meta = document.createElement("meta");
        meta.name = "description";
        meta.content = link.whitePageDescription;
        document.head.appendChild(meta);
      }
    }
  }, [link, state]);

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (state === "not-found") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            404 — Page Not Found
          </h1>
          <p className="text-gray-500">
            The page you are looking for does not exist or has expired.
          </p>
        </div>
      </div>
    );
  }

  if (state === "inactive") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Link Unavailable
          </h1>
          <p className="text-gray-500">
            This link is no longer active or has reached its click limit.
          </p>
        </div>
      </div>
    );
  }

  if (state === "blocked") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-500 mb-1">
            Your request has been blocked by our security system.
          </p>
          {botDetected && (
            <p className="text-xs text-gray-400 mt-2">
              Bot detection: {blockReason}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!link) return null;

  if (link.cloakType === "iframe") {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <header className="mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {link.whitePageTitle}
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed">
              {link.whitePageDescription}
            </p>
          </header>
          <main>
            <iframe
              src={link.destinationUrl}
              className="w-full h-[600px] border border-gray-200 rounded-lg"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title={link.whitePageTitle}
            />
          </main>
          <footer className="mt-16 pt-6 border-t border-gray-100 text-xs text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} {link.whitePageTitle}. All rights
              reserved.
            </p>
          </footer>
        </div>
      </div>
    );
  }

  const delay = link.redirectDelay ?? 3;
  const progress = ((delay - countdown) / delay) * 100;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {link.whitePageTitle}
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            {link.whitePageDescription}
          </p>
        </header>

        <main>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-gray-500">
                Verifying your access...
              </span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <article className="text-gray-600 leading-relaxed space-y-4">
            <p>
              Please wait while we verify your request and prepare the content
              for you. This process is automatic and will complete shortly.
            </p>
            {countdown > 0 && (
              <p>
                Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
              </p>
            )}
            <a
              href={link.destinationUrl}
              className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue Now
            </a>
          </article>
        </main>

        <footer className="mt-16 pt-6 border-t border-gray-100 text-xs text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} {link.whitePageTitle}. All rights
            reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
