"use client";

import { useEffect, useState } from "react";
import { collectAnalytics } from "@/lib/detect";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface LinkData {
  slug: string;
  destinationUrl: string;
  safePageUrl: string;
  moneyPageUrl: string;
  whitePageTitle: string;
  whitePageDescription: string;
  customDomain: string;
  redirectDelay: number;
  cloakType: string;
  isActive: boolean;
}

type PageState = "loading" | "redirecting" | "blocked" | "not-found" | "inactive";

export default function CloakedPage({ params }: PageProps) {
  const [link, setLink] = useState<LinkData | null>(null);
  const [state, setState] = useState<PageState>("loading");
  const [blockReason, setBlockReason] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [redirectTo, setRedirectTo] = useState("");
  const [isSafePage, setIsSafePage] = useState(false);

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

          fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, ...analytics }),
            keepalive: true,
          })
            .then((res) => res.json())
            .then((trackData) => {
              if (trackData.blocked) {
                setBlockReason(trackData.reason || "Traffic blocked");
                setState("blocked");
                return;
              }

              if (trackData.redirect) {
                setRedirectTo(trackData.redirect);
                setIsSafePage(trackData.isSafePage || false);
                setState("redirecting");
                return;
              }

              // Default: redirect to money page or destination
              const dest = data.link.moneyPageUrl || data.link.destinationUrl;
              setRedirectTo(dest);
              setState("redirecting");
            })
            .catch(() => {
              // Fallback: redirect to destination
              const dest = data.link.moneyPageUrl || data.link.destinationUrl;
              setRedirectTo(dest);
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
    if (state !== "redirecting") return;
    if (!redirectTo) return;

    if (countdown <= 0) {
      window.location.replace(redirectTo);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [state, redirectTo, countdown]);

  useEffect(() => {
    if (link && state === "redirecting") {
      document.title = link.whitePageTitle;
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">404</h1>
          <p className="text-gray-500">Page not found.</p>
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
          <p className="text-gray-500">This link is no longer active.</p>
        </div>
      </div>
    );
  }

  if (state === "blocked") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-500">Your request has been blocked.</p>
        </div>
      </div>
    );
  }

  if (!link) return null;

  // For safe page redirects (ad reviewers), show white page then redirect
  // For money page redirects (real users), show white page then redirect
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
                {isSafePage ? "Verifying content..." : "Preparing your content..."}
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
              Please wait while we prepare your content. This process is automatic.
            </p>
            {countdown > 0 && (
              <p>
                Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
              </p>
            )}
            <a
              href={redirectTo}
              className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue
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
