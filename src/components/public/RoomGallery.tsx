"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { Lightbox } from "./Lightbox";
import { RoomPhotoPlaceholder } from "./RoomPhotoPlaceholder";

type Img = { id: string; url: string; alt: string; caption: string };

const arrow =
  "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-forest-900 shadow-md backdrop-blur transition hover:bg-white focus-visible:opacity-100 sm:flex [@media(hover:hover)]:opacity-0 group-hover:opacity-100 disabled:!opacity-0";

/**
 * Room photos (uploaded by the owner): swipeable main photo (native scroll-snap), arrows + keyboard,
 * a thumbnail strip that follows along, and the full-screen Lightbox. Falls back to a "photos coming soon" placeholder.
 */
export function RoomGallery({ roomName, images }: { roomName: string; images: Img[] }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLUListElement>(null);

  // Keep the active thumbnail visible in the strip (horizontal scroll only — never jump the page).
  useEffect(() => {
    const strip = thumbs.current;
    const thumb = strip?.children[active] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    strip.scrollTo({ left: thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2, behavior: "smooth" });
  }, [active]);

  if (images.length === 0) {
    return <RoomPhotoPlaceholder roomName={roomName} className="aspect-[4/3] w-full rounded-md" />;
  }

  const many = images.length > 1;
  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: Math.max(0, Math.min(i, images.length - 1)) * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  };
  const current = images[active];

  return (
    <div>
      <div
        className="group relative overflow-hidden rounded-md bg-cream-100"
        role="region"
        aria-roledescription="carousel"
        aria-label={`${roomName} photos`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") goTo(active + 1);
          if (e.key === "ArrowLeft") goTo(active - 1);
        }}
      >
        <div
          ref={track}
          tabIndex={0}
          aria-label="Swipe or use arrow keys to browse photos"
          className="flex aspect-[4/3] snap-x outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-inset sm:aspect-[3/2] lg:aspect-[4/3] snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== active) setActive(i);
          }}
        >
          {images.map((img, i) => (
            <div
              key={img.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`Photo ${i + 1} of ${images.length}`}
              className="relative h-full w-full shrink-0 snap-center overflow-hidden"
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                preload={i === 0}
                sizes="(min-width: 1280px) 700px, (min-width: 1024px) 55vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:transition-none"
              />
            </div>
          ))}
        </div>

        {/* Bottom bar: caption + counter + full-screen button, over a soft gradient for legibility. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3 pt-12 sm:p-4 sm:pt-16">
          <p className="line-clamp-2 text-sm text-white/95 drop-shadow" aria-live="polite">
            {many && <span className="sr-only">Photo {active + 1} of {images.length}. </span>}
            {current.caption}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {many && (
              <span className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium text-white tabular-nums backdrop-blur" aria-hidden>
                {active + 1} / {images.length}
              </span>
            )}
            <button
              type="button"
              onClick={() => setLightbox(active)}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-forest-900 shadow backdrop-blur transition hover:bg-white"
            >
              <Expand size={14} aria-hidden />
              View all<span className="sr-only"> photos full screen</span>
            </button>
          </div>
        </div>

        {many && (
          <>
            <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0} className={`${arrow} left-3`} aria-label="Previous photo">
              <ChevronLeft size={22} aria-hidden />
            </button>
            <button type="button" onClick={() => goTo(active + 1)} disabled={active === images.length - 1} className={`${arrow} right-3`} aria-label="Next photo">
              <ChevronRight size={22} aria-hidden />
            </button>
          </>
        )}
      </div>

      {many && (
        <ul ref={thumbs} className="relative mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Choose a photo">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show photo ${i + 1}: ${img.alt}`}
                aria-current={i === active}
                className={`relative block aspect-[4/3] w-16 overflow-hidden rounded-sm ring-offset-2 transition sm:w-20 lg:w-24 ${
                  i === active ? "opacity-100 ring-2 ring-forest-600" : "opacity-60 hover:opacity-100"
                }`}
              >
                <Image src={img.url} alt="" fill sizes="(min-width: 1024px) 96px, 80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Lightbox
        images={images.map((i) => ({ url: i.url, alt: i.alt, caption: i.caption, isHotelPhoto: true }))}
        index={lightbox}
        onClose={() => {
          if (lightbox !== null) goTo(lightbox); // land on the photo the visitor stopped at
          setLightbox(null);
        }}
        onIndex={setLightbox}
      />
    </div>
  );
}
