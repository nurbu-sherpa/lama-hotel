import Link from "next/link";
import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { getHotel } from "@/lib/data/public";
import { buildMetadata, hotelJsonLd, JsonLd } from "@/lib/seo";
import { formatPhoneIntl, formatTime, telHref } from "@/lib/utils/format";
import { PageHeader } from "@/components/public/PageHeader";
import { LocationCard } from "@/components/public/LocationCard";

export function generateMetadata() {
  return buildMetadata({ path: "/location", pageSlug: "location", title: "Location" });
}

export default async function LocationPage() {
  const [hotel, hotelLd] = await Promise.all([getHotel(), hotelJsonLd()]);
  return (
    <>
      <JsonLd data={hotelLd} />
      <PageHeader
        eyebrow="Location"
        title="Find us in Jiri Bazaar"
        crumbs={[{ name: "Location", path: "/location" }]}
        intro={<p>{hotel.locationDescription || hotel.address}</p>}
      >
        <a href={hotel.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-8 !px-7">
          <Navigation size={18} aria-hidden /> Get Directions
        </a>
      </PageHeader>

      <section className="container-page grid gap-10 py-14 sm:py-20 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <LocationCard hotel={hotel} />
        </div>
        <div className="space-y-6 lg:col-span-5">
          <div className="card p-6">
            <h2 className="font-display text-2xl font-medium text-forest-900">Address</h2>
            <dl className="mt-4 space-y-4 text-ink/85">
              <div className="flex gap-3">
                <dt className="sr-only">Address</dt>
                <MapPin size={20} className="mt-0.5 shrink-0 text-clay-600" aria-hidden />
                <dd>
                  <strong className="block text-forest-900">{hotel.name}</strong>
                  {hotel.address}
                  {hotel.locationDescription && <span className="block text-clay-700">{hotel.locationDescription}</span>}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="sr-only">Phone</dt>
                <Phone size={20} className="mt-0.5 shrink-0 text-clay-600" aria-hidden />
                <dd>
                  <a href={telHref(hotel.phone)} className="font-medium underline-offset-2 hover:underline">
                    {formatPhoneIntl(hotel.phone)}
                  </a>
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="sr-only">Check-in and check-out</dt>
                <Clock size={20} className="mt-0.5 shrink-0 text-clay-600" aria-hidden />
                <dd>
                  Check-in from {formatTime(hotel.checkInTime)}
                  <br />
                  Check-out by {formatTime(hotel.checkOutTime)}
                </dd>
              </div>
            </dl>
          </div>
          <div className="panel-quiet p-6">
            <h2 className="font-display text-xl font-medium text-forest-900">Arriving in Jiri?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              When you reach Jiri Bazaar, look for Hotel Paras — we&apos;re right beside it on the right side. If you get lost, just call us.
            </p>
            <Link href="/jiri/how-to-reach" className="mt-3 inline-flex min-h-11 items-center text-[0.95rem] font-semibold text-clay-700 underline-offset-2 hover:underline">
              How to reach Jiri →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
