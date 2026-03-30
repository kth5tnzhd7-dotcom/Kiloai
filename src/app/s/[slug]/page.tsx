"use client";

import { useEffect, useState } from "react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface LinkData {
  slug: string;
  destinationUrl: string;
  whitePageTitle: string;
  whitePageDescription: string;
  customDomain: string;
}

export default function CloakedPage({ params }: PageProps) {
  const [link, setLink] = useState<LinkData | null>(null);
  const [notFound, setNotFound] = useState(false);
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
            setLink(data.link);
          } else {
            setNotFound(true);
          }
        })
        .catch(() => setNotFound(true));
    });
  }, [params]);

  useEffect(() => {
    if (!link) return;

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          window.location.href = link.destinationUrl;
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [link]);

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

  if (!link) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

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
                style={{ width: `${((3 - countdown) / 3) * 100}%` }}
              />
            </div>
          </div>

          <article className="text-gray-600 leading-relaxed space-y-4">
            <p>
              Please wait while we verify your request and prepare the content
              for you. This process is automatic and will complete shortly.
            </p>
            <p>
              Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
            </p>
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
