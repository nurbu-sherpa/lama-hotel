import Link from "next/link";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <rect width="64" height="64" rx="14" fill="#1e3460" />
      <path d="M10 46 25 22l8 12 6-8 15 20z" fill="#fafaf7" />
      <path d="m25 22 4.6 7.4-4.6-2.4-4.4 2.6z" fill="#d6a23d" />
    </svg>
  );
}

export function Logo({ name, light = false }: { name: string; light?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[1.15rem] font-semibold tracking-tight ${light ? "text-white" : "text-forest-900"}`}>
          {name}
        </span>
        <span className={`mt-1 text-[0.65rem] font-semibold tracking-[0.2em] uppercase ${light ? "text-cream-200" : "text-clay-600"}`}>
          Jiri Bazaar · Nepal
        </span>
      </span>
    </Link>
  );
}
