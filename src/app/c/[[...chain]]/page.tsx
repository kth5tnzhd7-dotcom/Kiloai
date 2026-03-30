"use client";

import { useEffect } from "react";

export default function ChainRedirect() {
  useEffect(() => {
    const path = window.location.pathname;
    const parts = path.split("/").filter(Boolean);

    if (parts.length < 3 || parts[0] !== "c") return;

    const chainId = parts[1];
    const stepNum = parseInt(parts[2]) || 0;

    const ua = navigator.userAgent;
    const botPatterns = [
      /bot|crawl|spider|scrape|fetch/i,
      /curl|wget|python|go-http/i,
      /headless|phantom|selenium|puppeteer|playwright/i,
      /googlebot|bingbot|facebookbot|twitterbot|telegrambot/i,
      /semrush|ahrefs|mj12bot|dotbot|petalbot/i,
      /gptbot|chatgpt|claudebot|anthropic/i,
    ];

    const isBot = botPatterns.some((p) => p.test(ua));

    if (isBot || !ua || ua.length < 15) {
      document.title = "Not Found";
      document.body.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui"><div style="text-align:center"><h1 style="font-size:24px;color:#111;margin-bottom:8px">404</h1><p style="color:#666;font-size:14px">Page not found</p></div></div>';
      return;
    }

    fetch(`/api/chain?id=${chainId}`)
      .then((r) => r.json())
      .then((data) => {
        const ch = data.chains?.find(
          (c: { id: string; isActive: boolean }) => c.id === chainId
        );

        if (!ch || !ch.isActive) {
          document.title = "Not Found";
          document.body.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui"><div style="text-align:center"><h1 style="font-size:24px;color:#111;margin-bottom:8px">404</h1><p style="color:#666;font-size:14px">Page not found</p></div></div>';
          return;
        }

        if (stepNum < ch.steps.length - 1) {
          const nextStep = stepNum + 1;
          const token = parts[3] || "";
          window.location.replace(`/c/${ch.id}/${nextStep}/${token}`);
        } else {
          window.location.replace(ch.destinationUrl);
        }
      })
      .catch(() => {
        document.title = "Not Found";
        document.body.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui"><div style="text-align:center"><h1 style="font-size:24px;color:#111;margin-bottom:8px">404</h1><p style="color:#666;font-size:14px">Page not found</p></div></div>';
      });
  }, []);

  return null;
}
