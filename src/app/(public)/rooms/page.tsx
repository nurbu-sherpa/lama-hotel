import { getFacilities, getHotel, getRooms } from "@/lib/data/public";
import { buildMetadata } from "@/lib/seo";
import { getPublicAvailability } from "@/lib/data/availability";
import { formatPrice, formatTime } from "@/lib/utils/format";
import { PageHeader } from "@/components/public/PageHeader";
import { RoomCard } from "@/components/public/RoomCard";
import { FacilityCard } from "@/components/public/FacilityCard";
import { CTASection } from "@/components/public/CTASection";

export function generateMetadata() {
  return buildMetadata({ path: "/rooms", pageSlug: "rooms", title: "Rooms & Prices" });
}

export default async function RoomsPage() {
  const [rooms, facilities, hotel, availability] = await Promise.all([getRooms(), getFacilities(), getHotel(), getPublicAvailability()]);
  const total = rooms.reduce((n, r) => n + r.totalRooms, 0);

  return (
    <>
      <PageHeader
        eyebrow="Rooms & prices"
        title="Rooms in Jiri Bazaar"
        crumbs={[{ name: "Rooms", path: "/rooms" }]}
        intro={
          <p>
            {total} rooms in {rooms.length} {rooms.length === 1 ? "type" : "types"}. All prices are{" "}
            <strong className="text-forest-900">per room</strong> — not per person.
          </p>
        }
      />

      <section className="container-page py-14 sm:py-20" aria-label="Room types">
        <div className="grid gap-10 md:grid-cols-2">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} headingLevel="h2" availability={availability?.find((a) => a.slug === room.slug)} facilities={facilities} />
          ))}
        </div>

        <div className="relative mt-16 overflow-x-auto rounded-md border border-cream-200 bg-white">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="px-5 pt-5 text-left font-display text-xl font-medium text-forest-900">Price overview</caption>
            <thead>
              <tr className="border-b border-cream-200 text-xs tracking-wider text-muted uppercase">
                <th scope="col" className="px-5 py-3 font-semibold">
                  Room type
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Price
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Rooms
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Beds per room
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id} className="border-b border-cream-100 last:border-0">
                  <th scope="row" className="px-5 py-4 font-semibold text-forest-900">
                    {r.name}
                  </th>
                  <td className="px-5 py-4">
                    {formatPrice(r.price, r.currency)} <span className="text-muted">{r.priceSuffix}</span>
                  </td>
                  <td className="px-5 py-4">{r.totalRooms}</td>
                  <td className="px-5 py-4">{r.bedDescription}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-cream-100 px-5 py-4 text-sm text-muted">
            Check-in from {formatTime(hotel.checkInTime)} · Check-out by {formatTime(hotel.checkOutTime)}. Your booking is confirmed only after we contact you.
          </p>
        </div>
      </section>

      {facilities.length > 0 && (
        <section className="bg-cream-100 py-14 sm:py-20" aria-labelledby="facilities-heading">
          <div className="container-page">
            <h2 id="facilities-heading" className="heading-section">
              For all guests
            </h2>
            <div className="mt-8 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {facilities.map((f) => (
                <FacilityCard key={f.id} name={f.name} description={f.description} icon={f.icon} />
              ))}
            </div>
          </div>
        </section>
      )}

      <CTASection hotel={hotel} heading="Ready to stay in Jiri?" body="Send us your dates — we'll confirm availability and get back to you." />
    </>
  );
}
