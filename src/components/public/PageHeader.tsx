import Image from "next/image";
import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { ImageCredit } from "./ImageCredit";

type Props = {
  title: string;
  eyebrow?: string;
  intro?: ReactNode;
  crumbs: Crumb[];
  image?: { url: string; alt: string; credit?: string };
  children?: ReactNode;
};

/** Sub-page header. With an image it becomes a photographic banner; otherwise a calm paper-toned band. */
export function PageHeader({ title, eyebrow, intro, crumbs, image, children }: Props) {
  if (image?.url) {
    return (
      <section className="relative isolate overflow-hidden bg-forest-950">
        <Image src={image.url} alt={image.alt} fill preload sizes="100vw" className="-z-10 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-950/90 via-forest-950/45 to-forest-950/20" />
        <div className="container-page pt-10 pb-16 sm:pt-14 sm:pb-24 lg:pt-20 lg:pb-28">
          <Breadcrumbs items={crumbs} light />
          {eyebrow && <p className="mt-10 text-[0.72rem] font-semibold tracking-[0.2em] text-clay-300 uppercase">{eyebrow}</p>}
          <h1 className="mt-3 max-w-3xl animate-fade-up font-display text-[2.6rem] leading-[1.05] font-medium tracking-tight text-white sm:text-6xl">{title}</h1>
          {intro && <div className="mt-5 max-w-2xl animate-fade-up text-lg leading-relaxed text-cream-100/90 [animation-delay:80ms]">{intro}</div>}
          {children}
        </div>
        {image.credit && <ImageCredit text={image.credit} className="absolute right-3 bottom-2" />}
      </section>
    );
  }
  return (
    <section className="border-b border-cream-200 bg-cream-100/70">
      <div className="container-page pt-8 pb-12 sm:pt-12 sm:pb-16">
        <Breadcrumbs items={crumbs} />
        {eyebrow && <p className="eyebrow mt-9">{eyebrow}</p>}
        <h1 className="mt-3 max-w-3xl animate-fade-up font-display text-[2.4rem] leading-[1.05] font-medium tracking-tight text-forest-900 sm:text-[3.4rem]">{title}</h1>
        {intro && <div className="mt-5 max-w-2xl animate-fade-up text-lg leading-relaxed text-muted [animation-delay:80ms]">{intro}</div>}
        {children}
      </div>
    </section>
  );
}
