import { MapPin } from "lucide-react";
import type { Hotel } from "@/lib/data/public";
import { ContactButtons } from "./ContactButtons";

/**
 * Location block. Shows an embedded Google Map only when the owner has pasted an official
 * "Embed a map" link in Admin → Google Maps; otherwise a clean card with the Get Directions button.
 */
export function LocationCard({ hotel, headingLevel = "h2" }: { hotel: Hotel; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <div className="card overflow-hidden">
      {hotel.googleMapsEmbedUrl ? (
        <iframe
          src={hotel.googleMapsEmbedUrl}
          title={`Map showing ${hotel.name}`}
          className="aspect-[16/10] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-forest-50">
          <svg className="absolute inset-0 h-full w-full text-forest-200" aria-hidden>
            <defs>
              <pattern id="topo" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M0 30 Q15 10 30 30 T60 30" fill="none" stroke="currentColor" strokeWidth="1" />
                <path d="M0 50 Q15 30 30 50 T60 50" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#topo)" />
          </svg>
          <a
            href={hotel.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex flex-col items-center gap-2 rounded-md border border-cream-200 bg-white px-6 py-4 text-center hover:border-forest-300"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-600 text-white">
              <MapPin size={24} aria-hidden />
            </span>
            <span className="font-semibold text-forest-900">Open in Google Maps</span>
          </a>
        </div>
      )}
      <div className="p-6">
        <Heading className="font-display text-2xl font-semibold text-forest-900">{hotel.name}</Heading>
        <p className="mt-2 text-ink/85">{hotel.address}</p>
        {hotel.locationDescription && <p className="mt-1 font-medium text-clay-700">{hotel.locationDescription}</p>}
        <ContactButtons hotel={hotel} show={["directions", "call", "whatsapp"]} className="mt-5" />
      </div>
    </div>
  );
}
