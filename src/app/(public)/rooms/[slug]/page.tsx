import Link from "next/link";
import { notFound } from "next/navigation";
import { BedDouble, CheckCircle2, DoorOpen, Users } from "lucide-react";
import { getFacilities, getHotel, getRoom, getRooms } from "@/lib/data/public";
import { buildMetadata } from "@/lib/seo";
import { getPublicAvailability } from "@/lib/data/availability";
import { Markdown, markdownToPlain } from "@/lib/markdown";
import { formatTime, whatsappHref } from "@/lib/utils/format";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { RoomGallery } from "@/components/public/RoomGallery";
import { RoomCard, RoomPrice } from "@/components/public/RoomCard";
import { AvailabilityBadge } from "@/components/public/AvailabilityBadge";
import { FacilityIcon } from "@/components/shared/icons";
import { ContactButtons } from "@/components/public/ContactButtons";

export async function generateMetadata({ params }: PageProps<"/rooms/[slug]">) {
  const { slug } = await params;
  const room = await getRoom(slug);
  if (!room) return { title: "Room not found", robots: { index: false } };
  return buildMetadata({
    path: `/rooms/${room.slug}`,
    title: room.metaTitle || room.name,
    description: room.metaDescription || markdownToPlain(room.description).slice(0, 160),
    image: room.images[0]?.url,
  });
}

export default async function RoomPage({ params }: PageProps<"/rooms/[slug]">) {
  const { slug } = await params;
  const [room, rooms, facilities, hotel, availability] = await Promise.all([getRoom(slug), getRooms(), getFacilities(), getHotel(), getPublicAvailability()]);
  if (!room) notFound();
  const others = rooms.filter((r) => r.slug !== room.slug);
  const waMessage = `Hello ${hotel.name},\n\nI would like to inquire about accommodation.\n\nCheck-in:\nCheck-out:\nGuests:\nRoom type: ${room.name}`;

  return (
    <>
      <div className="container-page pt-8">
        <Breadcrumbs
          items={[
            { name: "Rooms", path: "/rooms" },
            { name: room.name, path: `/rooms/${room.slug}` },
          ]}
        />
      </div>

      <div className="container-page pt-6 sm:pt-8">
        <p className="eyebrow">{hotel.name}</p>
        <h1 className="mt-2 font-display text-[2.6rem] leading-[1.05] font-medium tracking-tight text-forest-900 sm:text-[3.4rem]">{room.name}</h1>
      </div>

      {/* DOM order (mobile): photos → summary → description. Desktop: photos + description left, sticky summary right. */}
      <section className="container-page grid gap-10 py-8 sm:py-10 lg:grid-cols-12 lg:gap-x-14">
        <div className="lg:col-span-7 lg:row-start-1">
          <RoomGallery roomName={room.name} images={room.images} />
        </div>

        <aside className="lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1" aria-label={`${room.name} summary`}>
          <div className="lg:sticky lg:top-28">
            <div>
              <RoomPrice room={room} size="lg" />
              <p className="mt-2 text-[0.95rem] text-muted">Price is per room, not per person.</p>
            </div>
            {(() => {
              const a = availability?.find((x) => x.slug === room.slug);
              return a && room.status !== "UNAVAILABLE" ? <AvailabilityBadge availability={a} roomName={room.name} className="mt-4" /> : null;
            })()}
            {room.status === "UNAVAILABLE" && (
              <p className="mt-4 border-l-2 border-clay-600 bg-clay-50 px-4 py-3 text-[0.95rem] font-medium text-clay-700">
                This room type is currently unavailable. Please contact us — we may still be able to help.
              </p>
            )}

            <ul className="mt-6 space-y-3 border-y border-cream-300/80 py-6 text-ink/85">
              <li className="flex gap-3">
                <BedDouble size={20} className="shrink-0 text-forest-600" aria-hidden strokeWidth={1.7} />
                {room.bedDescription} per room
              </li>
              <li className="flex gap-3">
                <DoorOpen size={20} className="shrink-0 text-forest-600" aria-hidden strokeWidth={1.7} />
                {room.totalRooms} {room.totalRooms === 1 ? "room" : "rooms"} of this type
              </li>
              {room.capacityDescription && (
                <li className="flex gap-3">
                  <Users size={20} className="shrink-0 text-forest-600" aria-hidden strokeWidth={1.7} />
                  {room.capacityDescription}
                </li>
              )}
              {facilities.map((f) => (
                <li key={f.id} className="flex gap-3">
                  <FacilityIcon name={f.icon} size={20} className="shrink-0 text-forest-600" />
                  {f.name}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={`/booking?room=${room.slug}`} className="btn-primary !min-h-12 !px-7 text-base">
                Check Availability
              </Link>
              <a href={whatsappHref(hotel.whatsapp, waMessage)} target="_blank" rel="noopener noreferrer" className="btn-outline !min-h-12">
                Ask on WhatsApp
              </a>
            </div>
            <p className="mt-4 flex gap-2 text-[0.95rem] text-muted">
              <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden />
              Check-in {formatTime(hotel.checkInTime)} · Check-out {formatTime(hotel.checkOutTime)}
            </p>
            <p className="mt-1 text-sm text-muted">An inquiry is not a confirmed booking — we&apos;ll contact you to confirm.</p>
          </div>
        </aside>

        <div className="lg:col-span-7 lg:row-start-2">
          <section aria-labelledby="about-room">
            <h2 id="about-room" className="font-display text-[1.9rem] font-medium text-forest-900">
              About this room
            </h2>
            <Markdown text={room.description} className="prose-lodge mt-4" />
          </section>

          <div className="mt-10 border-t border-cream-300/80 pt-8">
            <h2 className="font-display text-xl font-medium text-forest-900">Questions before booking?</h2>
            <p className="mt-1.5 text-muted">Call or message us — we&apos;re happy to help.</p>
            <ContactButtons hotel={hotel} show={["call", "whatsapp", "email"]} className="mt-4" />
          </div>
        </div>
      </section>

      {others.length > 0 && (
        <section className="mt-8 border-t border-cream-200 bg-cream-100/70 py-16 sm:py-24" aria-labelledby="other-rooms">
          <div className="container-page">
            <h2 id="other-rooms" className="heading-section">
              Other rooms
            </h2>
            <div className="mt-10 grid gap-8 md:grid-cols-2">
              {others.map((r) => (
                <RoomCard key={r.id} room={r} availability={availability?.find((a) => a.slug === r.slug)} facilities={facilities} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
