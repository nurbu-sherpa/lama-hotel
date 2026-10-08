import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/format";

/** Consistent section header: small eyebrow → serif heading → optional intro, with an optional "see more" link. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  action,
  tone = "light",
  stacked = false,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  action?: { href: string; label: string };
  tone?: "light" | "dark";
  /** Put the action link under the text (for narrow side columns). */
  stacked?: boolean;
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("reveal flex flex-col gap-5", !stacked && "sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className={cn("eyebrow", dark && "!text-clay-300")}>{eyebrow}</p>}
        <h2 id={id} className={cn("heading-section mt-3", dark && "!text-white")}>
          {title}
        </h2>
        {intro && <div className={cn("mt-4 text-lg leading-relaxed", dark ? "text-cream-100/80" : "text-muted")}>{intro}</div>}
      </div>
      {action && (
        <Link
          href={action.href}
          className={cn(
            "group inline-flex min-h-11 shrink-0 items-center gap-2 self-start font-semibold",
            !stacked && "sm:self-end",
            dark ? "text-cream-100 hover:text-white" : "text-forest-800 hover:text-clay-700",
          )}
        >
          {action.label}
          <ArrowRight size={17} aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
