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
}

export default function CloakedPage({ params }: PageProps) {
  const [link, setLink] = useState<LinkData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [inactive, setInactive] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    params.then(({ slug }) => {
      fetch(`/api/links?slug=${slug}`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          if (data.link) {
            if (!data.link.isActive) {
              setInactive(true);
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
            }).catch(() => {});
          } else {
            setNotFound(true);
          }
        })
        .catch(() => setNotFound(true));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!link) return;

    if (countdown <= 0) {
      if (link.cloakType === "iframe") {
        return;
      }
      window.location.href = link.destinationUrl;
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [link, countdown]);

  useEffect(() => {
    if (link) {
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
  }, [link]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Page Not Found
          </h1>
          <p className="text-gray-500">
            This link does not exist or has expired.
          </p>
        </div>
      </div>
    );
  }

  if (inactive) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
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

  if (!link) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

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

  const progress = link.redirectDelay
    ? ((link.redirectDelay - countdown) / link.redirectDelay) * 100
    : ((3 - countdown) / 3) * 100;

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
