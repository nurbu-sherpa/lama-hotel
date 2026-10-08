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

  const img = shown?.img;
  const i = shown?.i ?? 0;

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
                className="h-auto max-h-[min(72vh,900px)] w-auto max-w-full rounded-lg object-contain shadow-2xl"
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
