"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BedDouble,
  BookOpenCheck,
  CalendarRange,
  CalendarCheck,
  CircleHelp,
  Hotel,
  Images,
  LayoutDashboard,
  ExternalLink,
  MapPin,
  Menu,
  MessageSquare,
  Mountain,
  Search,
  Settings,
  Sparkles,
  X,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils/format";

// Ordered by how often staff use each section: daily work first, setup last.
const GROUPS = [
  { items: [{ href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard }] },
  {
    label: "Inbox",
    items: [
      { href: "/admin/inquiries", label: "Booking Inquiries", Icon: CalendarCheck, badge: "bookings" as const },
      { href: "/admin/messages", label: "Contact Messages", Icon: MessageSquare, badge: "messages" as const },
    ],
  },
  {
    label: "Front desk",
    items: [
      { href: "/admin/reservations", label: "Reservations", Icon: BookOpenCheck },
      { href: "/admin/availability", label: "Availability", Icon: CalendarRange },
    ],
  },
  {
    label: "Property",
    items: [
      { href: "/admin/hotel", label: "Hotel Information", Icon: Hotel },
      { href: "/admin/maps", label: "Location & Maps", Icon: MapPin },
      { href: "/admin/rooms", label: "Rooms", Icon: BedDouble },
      { href: "/admin/facilities", label: "Facilities", Icon: Sparkles },
      { href: "/admin/gallery", label: "Gallery", Icon: Images },
    ],
  },
  {
    label: "Website content",
    items: [
      { href: "/admin/homepage", label: "Homepage", Icon: Home },
      { href: "/admin/jiri", label: "Jiri Guide", Icon: Mountain },
      { href: "/admin/faqs", label: "FAQs", Icon: CircleHelp },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/admin/seo", label: "SEO", Icon: Search },
      { href: "/admin/settings", label: "Settings", Icon: Settings },
    ],
  },
];

export function AdminSidebar({ counts }: { counts: { bookings: number; messages: number } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const newCount = counts.bookings + counts.messages;
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const nav = (
    <nav aria-label="Admin" className="space-y-5">
      {GROUPS.map((g, gi) => (
        <div key={gi}>
          {g.label && <p className="mb-1.5 px-3 text-[0.68rem] font-semibold tracking-[0.14em] text-cream-200/50 uppercase">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, Icon, ...rest }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              const badge = "badge" in rest && rest.badge ? counts[rest.badge] : 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active ? "bg-white/12 text-white" : "text-cream-100/75 hover:bg-white/6 hover:text-white",
                    )}
                  >
                    <Icon size={18} aria-hidden />
                    <span className="flex-1">{label}</span>
                    {badge > 0 && (
                      <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950" aria-label={`${badge} new`}>
                        {badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="border-t border-white/10 pt-4">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-cream-100/75 hover:bg-white/6 hover:text-white">
          <ExternalLink size={18} aria-hidden /> View website
        </a>
      </div>
    </nav>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-forest-900 text-white lg:hidden"
        aria-label={newCount > 0 ? `Open admin menu (${newCount} new)` : "Open admin menu"}
        aria-expanded={open}
      >
        <Menu size={20} aria-hidden />
        {newCount > 0 && (
          <span aria-hidden className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-amber-400 px-1.5 text-center text-xs leading-5 font-semibold text-amber-950">
            {newCount}
          </span>
        )}
      </button>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside
        style={{ viewTransitionName: "admin-sidebar" }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-forest-950 px-4 py-5 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <Link href="/admin/dashboard" className="font-display text-lg font-semibold text-white">
            Lama Hotel <span className="text-clay-300">Admin</span>
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-cream-100 hover:bg-white/10 lg:hidden" aria-label="Close admin menu">
            <X size={20} aria-hidden />
          </button>
        </div>
        {nav}
      </aside>
    </>
  );
}
