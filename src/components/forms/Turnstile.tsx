"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile (free, privacy-friendly CAPTCHA). Shows a small "Verifying… / Success" box; most
 * visitors never click — a checkbox appears only when Cloudflare is unsure. Adds a hidden `cf-turnstile-response` field.
 * The script loads only on pages that render a form. Renders nothing until the site key is set.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type TurnstileApi = {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<void> | null = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** `resetKey`: pass the form state — each new submit result gets a fresh token (tokens are single-use). */
export function Turnstile({ resetKey }: { resetKey?: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widget.current = window.turnstile.render(ref.current, { sitekey: SITE_KEY, appearance: "always", size: "flexible" });
      })
      .catch(() => {
        /* blocked/offline: the server still accepts the form if Cloudflare is unreachable */
      });
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (widget.current) window.turnstile?.reset(widget.current);
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={ref} />;
}
