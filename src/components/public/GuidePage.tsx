import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getHotel, getPage } from "@/lib/data/public";
import { Markdown } from "@/lib/markdown";
import { cn } from "@/lib/utils/format";
import { PageHeader } from "./PageHeader";
import { ImageCredit } from "./ImageCredit";
import { CTASection } from "./CTASection";
import type { Crumb } from "./Breadcrumbs";

export const GUIDE_PAGES = [
  { slug: "jiri", href: "/jiri", label: "About Jiri" },
  { slug: "jiri-things-to-do", href: "/jiri/things-to-do", label: "Things to Do" },
  { slug: "jiri-how-to-reach", href: "/jiri/how-to-reach", label: "How to Reach Jiri" },
] as const;

/** Renders a Jiri guide page entirely from editable database sections (Admin → Jiri Guide). */
export async function GuidePage({ slug, crumbs }: { slug: (typeof GUIDE_PAGES)[number]["slug"]; crumbs: Crumb[] }) {
  const [page, hotel] = await Promise.all([getPage(slug), getHotel()]);
  if (!page) notFound();
  const headerImage = page.sections.find((s) => s.imageUrl);
  const otherGuides = GUIDE_PAGES.filter((g) => g.slug !== slug);

  return (
    <>
      <PageHeader
        eyebrow="Jiri travel guide"
        title={page.title}
        intro={page.intro ? <p>{page.intro}</p> : undefined}
        crumbs={crumbs}
        image={headerImage ? { url: headerImage.imageUrl, alt: headerImage.imageAlt, credit: headerImage.imageCredit } : undefined}
      />

      <nav aria-label="Jiri guide" className="sticky top-16 z-20 border-b border-cream-200 bg-cream-50/95 backdrop-blur-sm lg:top-[4.5rem]">
        <ul className="relative container-page flex gap-2 overflow-x-auto">
          {GUIDE_PAGES.map((g) => {
            const active = g.slug === slug;
            return (
              <li key={g.slug} className="shrink-0">
                <Link
                  href={g.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-12 items-center border-b-2 px-2 text-[0.95rem] font-semibold transition-colors sm:px-3",
                    active ? "border-clay-600 text-forest-900" : "border-transparent text-ink/65 hover:border-cream-300 hover:text-forest-900",
                  )}
                >
                  {g.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="container-page space-y-20 py-16 sm:space-y-28 sm:py-24">
        {page.sections.map((s, i) => (
          <section key={s.key} aria-labelledby={`h-${s.key}`} className={cn("grid items-center gap-8 scroll-mt-36 lg:gap-16", s.imageUrl && "lg:grid-cols-2")} id={`s-${s.key}`}>
            {s.imageUrl && (
              <figure className={cn("reveal relative aspect-[4/3] overflow-hidden rounded-md bg-cream-200", i % 2 === 1 && "lg:order-2")}>
                <Image src={s.imageUrl} alt={s.imageAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                <span className="absolute top-3 left-3 rounded-sm bg-white/90 px-2 py-0.5 text-xs font-semibold text-forest-900">Jiri area</span>
                {s.imageCredit && <ImageCredit text={s.imageCredit} className="absolute right-2 bottom-2" />}
              </figure>
            )}
            <div className={cn("reveal", !s.imageUrl && "max-w-3xl")}>
              <p className="eyebrow">{String(i + 1).padStart(2, "0")}</p>
              <h2 id={`h-${s.key}`} className="mt-2 font-display text-[1.9rem] leading-tight font-medium tracking-tight text-forest-900 sm:text-[2.3rem]">{s.heading}</h2>
              <Markdown text={s.body} className="prose-lodge mt-5" />
            </div>
          </section>
        ))}
      </div>

      {/* Plan your stay — internal links */}
      <section aria-labelledby="plan-heading" className="border-t border-cream-200 bg-cream-100/70">
        <div className="container-page grid gap-8 py-14 sm:py-16 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">Plan your stay</p>
            <h2 id="plan-heading" className="mt-2 font-display text-2xl font-medium text-forest-900">
              Staying in Jiri?
            </h2>
            <p className="mt-2 text-muted">{hotel.name} is in Jiri Bazaar — a simple, comfortable base for your visit.</p>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-md border border-cream-300/80 bg-cream-300/80 sm:grid-cols-2 lg:col-span-8">
            {[
              ...otherGuides.map((g) => ({ href: g.href, label: g.label, note: "Jiri travel guide" })),
              { href: "/rooms", label: "Rooms & prices", note: "Per room, not per person" },
              { href: "/location", label: "Find the lodge", note: hotel.locationDescription || hotel.address },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="group flex h-full items-center justify-between gap-4 bg-cream-50 px-5 py-4 hover:bg-white">
                  <span>
                    <span className="block font-semibold text-forest-900 group-hover:text-clay-700">{l.label}</span>
                    <span className="block text-sm text-muted">{l.note}</span>
                  </span>
                  <ArrowRight size={18} aria-hidden className="shrink-0 text-clay-600 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CTASection
        hotel={hotel}
        heading={`Stay at ${hotel.name}`}
        body={`A comfortable base in Jiri Bazaar${hotel.locationDescription ? ` — ${hotel.locationDescription.toLowerCase()}` : ""}.`}
      />
    </>
  );
}
