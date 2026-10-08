import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export type Crumb = { name: string; path: string };

/** Visible breadcrumb trail + BreadcrumbList structured data. "Home" is added automatically. */
export function Breadcrumbs({ items, light = false }: { items: Crumb[]; light?: boolean }) {
  const all = [{ name: "Home", path: "/" }, ...items];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(all)} />
      <nav aria-label="Breadcrumb">
        <ol className={`flex flex-wrap items-center gap-1 text-sm ${light ? "text-cream-100/85" : "text-muted"}`}>
          {all.map((c, i) => {
            const last = i === all.length - 1;
            return (
              <li key={c.path} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={14} aria-hidden className="opacity-60" />}
                {last ? (
                  <span aria-current="page" className={light ? "text-white" : "text-ink"}>
                    {c.name}
                  </span>
                ) : (
                  <Link href={c.path} className="inline-flex min-h-6 min-w-6 items-center underline-offset-4 hover:underline">
                    {c.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
