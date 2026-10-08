import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, DoorOpen } from "lucide-react";
import type { PublicRoom } from "@/lib/data/public";
import { formatPrice } from "@/lib/utils/format";
import { FacilityIcon } from "@/components/shared/icons";
import { RoomPhotoPlaceholder } from "./RoomPhotoPlaceholder";
import { AvailabilityBadge } from "./AvailabilityBadge";
import type { PublicAvailability } from "@/lib/data/availability";

export function RoomPrice({ room, size = "md" }: { room: Pick<PublicRoom, "price" | "currency" | "priceSuffix">; size?: "md" | "lg" }) {
  return (
    <p className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className={size === "lg" ? "font-display text-[2.6rem] leading-none font-medium text-forest-900 tabular-nums" : "font-display text-[1.65rem] leading-none font-medium text-forest-900 tabular-nums"}>
        {formatPrice(room.price, room.currency)}
      </span>
      <span className="text-[0.95rem] text-muted">{room.priceSuffix || "/ room"}</span>
    </p>
  );
}

type Facility = { id: string; name: string; icon: string };

export function RoomCard({
  room,
  headingLevel = "h3",
  availability,
  facilities = [],
}: {
  room: PublicRoom;
  headingLevel?: "h2" | "h3";
  availability?: PublicAvailability | null;
  /** Confirmed, active facilities (shown as a short line — never invented). */
  facilities?: Facility[];
}) {
  const Heading = headingLevel;
  const cover = room.images[0];
  const unavailable = room.status === "UNAVAILABLE";
  return (
    <article className="reveal group flex flex-col">
      <Link href={`/rooms/${room.slug}`} className="relative block aspect-[4/3] overflow-hidden rounded-md" tabIndex={-1} aria-hidden>
        {cover ? (
          <Image
            src={cover.url}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-[1.06]"
          />
        ) : (
          <RoomPhotoPlaceholder roomName={room.name} className="h-full w-full" />
        )}
        {unavailable && (
          <span className="absolute top-3 left-3 rounded-sm bg-white px-2.5 py-1 text-xs font-semibold text-clay-700">Currently unavailable</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col pt-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <Heading className="font-display text-[1.75rem] leading-tight font-medium text-forest-900">
            <Link href={`/rooms/${room.slug}`} className="hover:text-clay-700">
              {room.name}
            </Link>
          </Heading>
          <RoomPrice room={room} />
        </div>
        <p className="mt-1 text-sm text-muted">Price is per room, not per person.</p>
        {availability && !unavailable && <AvailabilityBadge availability={availability} roomName={room.name} className="mt-3 self-start" />}

        <ul className="mt-5 grid gap-x-6 gap-y-2.5 border-t border-cream-300/80 pt-5 text-[0.98rem] text-ink/85 sm:grid-cols-2">
          <li className="flex items-center gap-2.5">
            <BedDouble size={19} className="shrink-0 text-forest-600" aria-hidden strokeWidth={1.7} />
            {room.bedDescription}
          </li>
          <li className="flex items-center gap-2.5">
            <DoorOpen size={19} className="shrink-0 text-forest-600" aria-hidden strokeWidth={1.7} />
            {room.totalRooms} {room.totalRooms === 1 ? "room" : "rooms"}
          </li>
          {facilities.map((f) => (
            <li key={f.id} className="flex items-center gap-2.5">
              <FacilityIcon name={f.icon} size={19} className="shrink-0 text-forest-600" />
              {f.name}
            </li>
          ))}
        </ul>
        {room.shortDescription && <p className="mt-4 max-w-[60ch] leading-relaxed text-muted">{room.shortDescription}</p>}

        <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 pt-6">
          <Link href={`/booking?room=${room.slug}`} className="btn-primary">
            Check Availability
          </Link>
          <Link href={`/rooms/${room.slug}`} className="group/link inline-flex min-h-11 items-center gap-1.5 font-semibold text-forest-800 hover:text-clay-700" aria-label={`View room: ${room.name}`}>
            View room <ArrowRight size={16} aria-hidden className="transition-transform group-hover/link:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
