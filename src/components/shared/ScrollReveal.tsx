"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Gentle scroll-reveal for every page (progressive enhancement).
 *
 * Targets: elements marked `.reveal` / `[data-reveal]`, plus every content <section> in <main>
 * after the first (the first is the page header/hero, which has its own entrance).
 *
 * Uses the Web Animations API, so it never changes element attributes or classes — that keeps it
 * safe with React hydration (including streamed/Suspense segments) and means content is fully
 * visible without JavaScript. The animation starts just before an element scrolls into view, so
 * nothing flashes. Disabled for prefers-reduced-motion and when the APIs are unavailable.
 */
const KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: "translateY(24px)", filter: "blur(6px)" },
  { opacity: 1, transform: "none", filter: "none" },
];

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (!("IntersectionObserver" in window) || typeof Element.prototype.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const firstSection = document.querySelector("main section");
    const explicit = Array.from(document.querySelectorAll<HTMLElement>("main .reveal, main [data-reveal]"));
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main section")).filter(
      (s) => s !== firstSection && s.parentElement?.closest("section") === null && !s.querySelector(".reveal, [data-reveal]"),
    );
    const all = [...sections, ...explicit];
    // Avoid double animation: skip anything nested inside another target.
    const targets = all.filter((el) => !all.some((other) => other !== el && other.contains(el)));

    // Stagger siblings slightly (≤ 4 steps of 70ms).
    const delay = new Map<Element, number>();
    const counts = new Map<Element, number>();
    for (const el of targets) {
      const parent = el.parentElement!;
      const i = counts.get(parent) ?? 0;
      counts.set(parent, i + 1);
      delay.set(el, Math.min(i, 4) * 90);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          io.unobserve(el);
          el.animate(KEYFRAMES, { duration: 850, delay: delay.get(el) ?? 0, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", fill: "backwards" });
        }
      },
      // Fire slightly BEFORE the element becomes visible, so it starts hidden (no flash).
      { rootMargin: "0px 0px 48px 0px", threshold: 0 },
    );

    const fold = window.innerHeight;
    for (const el of targets) {
      // Only animate content that is still below the fold; what's on screen stays put.
      if (el.getBoundingClientRect().top > fold) io.observe(el);
    }
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
