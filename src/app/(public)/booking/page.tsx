import { Clock, Info, Phone } from "lucide-react";
import { getHotel, getRooms } from "@/lib/data/public";
import { buildMetadata } from "@/lib/seo";
import { formatPhoneIntl, formatTime, telHref, todayInNepal, whatsappHref } from "@/lib/utils/format";
import { PageHeader } from "@/components/public/PageHeader";
import { BookingForm } from "@/components/forms/BookingForm";
import { WhatsAppIcon } from "@/components/shared/icons";

export function generateMetadata() {
  return buildMetadata({ path: "/booking", pageSlug: "booking", title: "Booking Inquiry" });
}

export default async function BookingPage({ searchParams }: PageProps<"/booking">) {
  const sp = await searchParams;
  const requested = typeof sp.room === "string" ? sp.room : undefined;
  const [rooms, hotel] = await Promise.all([getRooms(), getHotel()]);
  const defaultRoom = rooms.find((r) => r.slug === requested)?.slug;

  return (
    <>
      <PageHeader
        eyebrow="Booking inquiry"
        title="Check Availability"
        crumbs={[{ name: "Booking", path: "/booking" }]}
        intro={<p>Tell us your dates and we&apos;ll contact you to confirm availability. No payment is needed online.</p>}
      />

      <section className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-8">
          <p className="mb-6 flex gap-3 border-l-2 border-clay-600 bg-clay-50 px-4 py-3 text-[0.98rem] text-ink">
            <Info size={19} aria-hidden className="mt-0.5 shrink-0 text-clay-700" />
            <span>
              <strong className="font-semibold">This is a booking inquiry, not a confirmed reservation.</strong> We&apos;ll check availability and contact you to confirm.
            </span>
          </p>
          {rooms.length > 0 ? (
            <BookingForm
              rooms={rooms.map((r) => ({
                slug: r.slug,
                name: r.name,
                price: r.price,
                currency: r.currency,
                priceSuffix: r.priceSuffix,
                status: r.status,
                totalRooms: r.totalRooms,
              }))}
              defaultRoom={defaultRoom}
              today={todayInNepal()}
              whatsappNumber={hotel.whatsapp}
            />
          ) : (
            <p className="card p-6">Online inquiries are temporarily unavailable. Please call or WhatsApp us.</p>
          )}
        </div>

        <aside className="lg:col-span-4">
          <div className="space-y-8 lg:sticky lg:top-28">
            <section aria-labelledby="how-heading">
              <h2 id="how-heading" className="font-display text-xl font-medium text-forest-900">
                How booking works
              </h2>
              <ol className="mt-4 space-y-4">
                {["Send us your inquiry using this form.", "We check availability for your dates.", "We contact you by phone, WhatsApp or email to confirm."].map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-800 text-sm font-semibold text-white">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 leading-relaxed text-ink/85">{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-[0.95rem] text-muted">Your room is confirmed only after we confirm it with you.</p>
            </section>

            <section aria-labelledby="times-heading" className="border-t border-cream-300/80 pt-6">
              <h2 id="times-heading" className="flex items-center gap-2 font-display text-xl font-medium text-forest-900">
                <Clock size={18} aria-hidden className="text-clay-600" /> Check-in &amp; check-out
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-sm text-muted">Check-in from</dt>
                  <dd className="font-display text-2xl text-forest-900">{formatTime(hotel.checkInTime)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Check-out by</dt>
                  <dd className="font-display text-2xl text-forest-900">{formatTime(hotel.checkOutTime)}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="talk-heading" className="border-t border-cream-300/80 pt-6">
              <h2 id="talk-heading" className="font-display text-xl font-medium text-forest-900">
                Prefer to talk?
              </h2>
              <div className="mt-4 grid gap-3">
                <a href={telHref(hotel.phone)} className="btn-outline justify-start">
                  <Phone size={17} aria-hidden /> Call {formatPhoneIntl(hotel.phone)}
                </a>
                <a href={whatsappHref(hotel.whatsapp)} target="_blank" rel="noopener noreferrer" className="btn-outline justify-start">
                  <WhatsAppIcon size={17} /> WhatsApp us
                </a>
              </div>
            </section>
          </div>
        </aside>
      </section>
    </>
  );
}
