"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/format";

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-1">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              prefetch // full prefetch: public data is server-cached, so switching pages is instant
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex min-h-11 items-center px-3 text-[0.98rem] font-medium transition-colors",
                // Understated active indicator: a short underline, not a filled pill.
                "after:absolute after:inset-x-3 after:bottom-2 after:h-px after:origin-left after:bg-clay-600 after:transition-transform after:duration-200",
                active ? "text-forest-900 after:scale-x-100" : "text-ink/70 after:scale-x-0 hover:text-forest-900 hover:after:scale-x-100",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
