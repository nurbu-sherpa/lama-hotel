import { cn } from "@/lib/utils/format";

/**
 * The logo mark, animated: the tile settles in, the mountain outline draws itself,
 * fills, and the gold summit pops. `loop` repeats draw → erase for loading states.
 * Pure CSS (see "Lodge loader" in globals.css).
 */
export function LodgeLoader({ loop = false, className = "h-16 w-16" }: { loop?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("lodge-loader", loop && "lodge-loader--loop", className)} aria-hidden focusable="false">
      <rect className="ll-tile" width="64" height="64" rx="14" />
      <path className="ll-peak" d="M10 46 25 22l8 12 6-8 15 20z" pathLength={1} />
      <path className="ll-snow" d="m25 22 4.6 7.4-4.6-2.4-4.4 2.6z" />
    </svg>
  );
}

/** Route loading screen (website and admin). Fades in after a short delay so fast navigations don't flash. */
export function PageLoader() {
  return (
    <div role="status" className="page-loading flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <LodgeLoader loop className="h-14 w-14" />
      <span className="text-sm font-medium tracking-[0.2em] text-muted uppercase">Loading</span>
    </div>
  );
}
