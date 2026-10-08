"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, Phone, X } from "lucide-react";
import { WhatsAppIcon } from "@/components/shared/icons";
import { cn } from "@/lib/utils/format";
import { isActivePath } from "./NavLinks";

type Props = {
  items: { href: string; label: string }[];
  phoneHref: string;
  phoneLabel: string;
  whatsappHref: string;
};

export function MobileNav({
  items,
  phoneHref,
  phoneLabel,
  whatsappHref,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
      // Simple focus trap.
      if (e.key === "Tab" && panelRef.current) {
        const focusables =
          panelRef.current.querySelectorAll<HTMLElement>("a,button");
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-cream-300 bg-white text-forest-900"
      >
        {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
      </button>

      {/* Portalled to <body>: the header's backdrop-filter would otherwise become the containing
          block for this fixed panel and squash it to the header's height. */}
      {open &&
        createPortal(
          <div
            id="mobile-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto overscroll-contain bg-cream-50 animate-fade-up"
          >
            <nav aria-label="Mobile" className="container-page py-6">
              <ul className="divide-y divide-cream-200 border-y border-cream-200">
                {items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        prefetch
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center justify-between py-4 font-display text-2xl",
                          active ? "text-clay-600" : "text-forest-900",
                        )}
                      >
                        {item.label}
                        <span aria-hidden className="text-base text-muted">
                          →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-8 grid gap-3">
                <a href={phoneHref} className="btn-dark w-full">
                  <Phone size={18} aria-hidden /> Call {phoneLabel}
                </a>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline w-full"
                >
                  <WhatsAppIcon size={18} /> WhatsApp us
                </a>
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}
