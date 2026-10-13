"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils/format";

/**
 * Floating "back to top" button. Appears after the first screen; its ring fills with scroll
 * progress (CSS scroll-driven animation, static full ring where unsupported — see globals.css).
 */
export function ScrollToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    document.querySelector<HTMLElement>("#main")?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
      className={cn(
        "to-top group fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex h-12 w-12 items-center justify-center rounded-full bg-forest-900 text-white shadow-lg transition-[opacity,translate,scale,background-color] duration-(--dur-base) ease-smooth hover:bg-forest-800 active:scale-95 lg:right-6 lg:bottom-6",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 scale-90 opacity-0",
      )}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r="22" fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="2" />
        <circle className="to-top-ring" cx="24" cy="24" r="22" fill="none" stroke="var(--color-clay-400)" strokeWidth="2" strokeLinecap="round" pathLength={1} />
      </svg>
      <ArrowUp size={20} aria-hidden className="transition-transform duration-(--dur-base) ease-smooth group-hover:-translate-y-0.5" />
    </button>
  );
}
