"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LightboxImage = { url: string; alt: string; title?: string; caption?: string; credit?: string; isHotelPhoto?: boolean };

const navBtn =
  "flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-white/20 active:scale-95";

/**
 * Accessible lightbox built on the native <dialog> element (focus trap + Escape for free).
 * Open/close and image-change animations are pure CSS (see `.lightbox` in globals.css).
 */
export function Lightbox({
  images,
  index,
  onClose,
  onIndex,
}: {
  images: LightboxImage[];
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [dir, setDir] = useState(0);
  // Each photo's real width/height ratio, learned on load (4:3 until then).
  const [ratios, setRatios] = useState<Record<string, number>>({});
  // Last shown image — kept so the content stays visible while the dialog animates closed.
  const [shown, setShown] = useState<{ img: LightboxImage; i: number } | null>(null);
  const open = index !== null;
  if (open && images[index] && (shown?.i !== index || shown.img !== images[index])) setShown({ img: images[index], i: index });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const go = (step: 1 | -1) => {
    setDir(step);
    onIndex((index! + step + images.length) % images.length);
  };
  const jump = (t: number) => {
    setDir(t > index! ? 1 : -1);
    onIndex(t);
  };
  const close = () => {
    setDir(0);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Keep the active thumbnail centred in the strip.
  const thumbs = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const strip = thumbs.current;
    const thumb = strip?.children[index ?? 0] as HTMLElement | undefined;
    if (strip && thumb) strip.scrollTo({ left: thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2, behavior: "smooth" });
  }, [index]);

  const img = shown?.img;
  const i = shown?.i ?? 0;
  const ratio = (img && ratios[img.url]) || 4 / 3;
  const maxH = images.length > 1 ? "min(64dvh, 860px)" : "min(74dvh, 920px)";

  return (
    <dialog
      ref={ref}
      onClose={close}
      onClick={(e) => e.target === ref.current && close()}
      aria-label={img?.title || img?.alt || "Image viewer"}
      className="lightbox m-auto h-full max-h-none w-full max-w-none bg-transparent p-0"
    >
      {img && (
        <div className="flex h-full flex-col items-center justify-center p-4 sm:p-10" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="absolute top-4 right-4 left-4 z-10 flex items-center justify-between">
            {images.length > 1 ? (
              <span aria-live="polite" aria-atomic="true" className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-white tabular-nums backdrop-blur-md">
                {i + 1} / {images.length}
              </span>
            ) : (
              <span />
            )}
            <button type="button" onClick={close} aria-label="Close" className={navBtn}>
              <X size={22} aria-hidden />
            </button>
          </div>

          <figure className="lightbox-panel flex w-full max-w-5xl flex-col">
            {/* Not `fill`: an in-flow image sizes itself from its own aspect ratio, so it can't collapse to 0px. */}
            <div key={i} className="flex animate-lightbox-in justify-center" style={{ "--dir": dir } as CSSProperties}>
              <Image
                src={img.url}
                alt={img.alt}
                width={1600}
                height={1200}
                sizes="(min-width: 1024px) 1024px, 100vw"
                onLoad={(e) => {
                  const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                  if (w && h) setRatios((r) => (r[img.url] ? r : { ...r, [img.url]: w / h }));
                }}
                // As wide as the panel allows, unless the screen height is the limit — always in the photo's own
                // ratio, so the frame (and its shadow and rounded corners) is exactly the photo.
                style={{ width: `min(100%, calc(${maxH} * ${ratio}))`, height: "auto", aspectRatio: ratio }}
                className="rounded-lg object-cover shadow-2xl"
              />
            </div>
            <figcaption className="mt-5 text-center text-sm text-cream-100">
              {img.title && <span className="block font-display text-lg text-white">{img.title}</span>}
              {img.caption && <span className="mt-1 block">{img.caption}</span>}
              {img.isHotelPhoto === false && <span className="mt-1 block text-xs text-clay-300">Destination photo — not a photo of the hotel</span>}
              {img.credit && <span className="mt-1 block text-xs text-cream-200/70">{img.credit}</span>}
            </figcaption>
          </figure>

          {images.length > 1 && (
            <ul ref={thumbs} aria-label="Choose an image" className="mt-4 flex w-full max-w-5xl gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] justify-center-safe [&::-webkit-scrollbar]:hidden">
              {images.map((t, n) => (
                <li key={t.url + n} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => jump(n)}
                    aria-label={`Show image ${n + 1}: ${t.alt}`}
                    aria-current={n === i}
                    className={`relative block aspect-[4/3] w-14 overflow-hidden rounded-md transition sm:w-20 ${
                      n === i ? "opacity-100 ring-2 ring-white" : "opacity-50 hover:opacity-90"
                    }`}
                  >
                    <Image src={t.url} alt="" fill sizes="80px" className="object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {images.length > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Previous image" className={`${navBtn} absolute top-1/2 left-2 -translate-y-1/2 sm:left-6`}>
                <ChevronLeft size={24} aria-hidden />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next image" className={`${navBtn} absolute top-1/2 right-2 -translate-y-1/2 sm:right-6`}>
                <ChevronRight size={24} aria-hidden />
              </button>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
