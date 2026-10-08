"use client";

import Image from "next/image";
import { useState } from "react";
import { Lightbox } from "./Lightbox";
import { RoomPhotoPlaceholder } from "./RoomPhotoPlaceholder";

type Img = { id: string; url: string; alt: string; caption: string };

/** Room photos (uploaded by the owner). Falls back to a clear "photos coming soon" placeholder. */
export function RoomGallery({ roomName, images }: { roomName: string; images: Img[] }) {
  const [index, setIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return <RoomPhotoPlaceholder roomName={roomName} className="aspect-[4/3] w-full rounded-md" />;
  }

  const [first, ...rest] = images;
  return (
    <div>
      <button type="button" onClick={() => setIndex(0)} className="relative block aspect-[4/3] w-full overflow-hidden rounded-md" aria-label={`View larger: ${first.alt}`}>
        <Image src={first.url} alt={first.alt} fill preload sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
      </button>
      {rest.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {rest.map((img, i) => (
            <li key={img.id}>
              <button type="button" onClick={() => setIndex(i + 1)} className="relative block aspect-square w-full overflow-hidden rounded-sm" aria-label={`View larger: ${img.alt}`}>
                <Image src={img.url} alt={img.alt} fill sizes="25vw" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Lightbox
        images={images.map((i) => ({ url: i.url, alt: i.alt, caption: i.caption, isHotelPhoto: true }))}
        index={index}
        onClose={() => setIndex(null)}
        onIndex={setIndex}
      />
    </div>
  );
}
