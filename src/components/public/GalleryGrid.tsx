"use client";

import Image from "next/image";
import { useState } from "react";
import type { PublicGalleryImage } from "@/lib/data/public";
import { cn } from "@/lib/utils/format";
import { Lightbox } from "./Lightbox";

type Props = {
  images: PublicGalleryImage[];
  categories: { slug: string; name: string }[];
};

export function GalleryGrid({ images, categories }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [index, setIndex] = useState<number | null>(null);

  const usedCategories = categories.filter((c) => images.some((i) => i.category?.slug === c.slug));
  const visible = filter === "all" ? images : images.filter((i) => i.category?.slug === filter);

  return (
    <div>
      {usedCategories.length > 1 && (
        <div role="group" aria-label="Filter photos by category" className="mb-8 flex flex-wrap gap-2">
          {[{ slug: "all", name: "All" }, ...usedCategories].map((c) => (
            <button
              key={c.slug}
              type="button"
              aria-pressed={filter === c.slug}
              onClick={() => setFilter(c.slug)}
              className={cn(
                "min-h-11 rounded-md border px-4 py-2 text-[0.95rem] font-medium transition-colors",
                filter === c.slug ? "border-forest-800 bg-forest-800 text-white" : "border-cream-300 bg-white text-ink hover:bg-cream-100",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {visible.map((img, i) => (
          <li key={img.id} className="mb-4 break-inside-avoid">
            <figure className="overflow-hidden rounded-md border border-cream-200 bg-white">
              <button
                type="button"
                onClick={() => setIndex(i)}
                className="group relative block w-full"
                aria-label={`View larger: ${img.title}`}
              >
                <Image
                  src={img.url}
                  alt={img.alt}
                  width={800}
                  height={600}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="h-auto w-full transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-[1.06]"
                />
                <span
                  className={cn(
                    "absolute top-3 left-3 rounded-sm px-2 py-0.5 text-[0.72rem] font-semibold",
                    img.isHotelPhoto ? "bg-forest-800 text-white" : "bg-white/90 text-forest-900",
                  )}
                >
                  {img.isHotelPhoto ? "At the lodge" : img.category?.name ? `${img.category.name} · Jiri area` : "Jiri area"}
                </span>
              </button>
              <figcaption className="px-4 py-3">
                <span className="block text-sm font-semibold text-forest-900">{img.title}</span>
                {img.caption && <span className="mt-0.5 block text-sm text-muted">{img.caption}</span>}
                {img.credit && <span className="mt-1 block text-[0.7rem] text-muted/80">{img.credit}</span>}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <Lightbox images={visible} index={index} onClose={() => setIndex(null)} onIndex={setIndex} />
    </div>
  );
}
