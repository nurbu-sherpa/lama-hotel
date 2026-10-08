import { getHotel } from "@/lib/data/public";
import { buildMetadata } from "@/lib/seo";
import { formatTime } from "@/lib/utils/format";
import { PageHeader } from "@/components/public/PageHeader";

export function generateMetadata() {
  return buildMetadata({ path: "/terms", title: "Terms of Use", description: "Terms for using the Lama Hotel & Lodge website and sending booking inquiries." });
}

export default async function TermsPage() {
  const hotel = await getHotel();
  return (
    <>
      <PageHeader title="Terms of Use" crumbs={[{ name: "Terms", path: "/terms" }]} />
      <article className="container-page prose-lodge max-w-3xl py-12 sm:py-16 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-forest-900">
        <h2>Booking inquiries</h2>
        <p>
          Sending a booking inquiry through this website is a request, not a confirmed reservation. A booking is confirmed only when {hotel.name} contacts you
          and confirms availability for your dates.
        </p>
        <h2>Prices</h2>
        <p>
          Prices shown on this website are per room, not per person, and are listed in the currency shown. Prices may change; the price that applies to your
          stay is the one we confirm with you.
        </p>
        <h2>Check-in and check-out</h2>
        <p>
          Check-in is from {formatTime(hotel.checkInTime)} and check-out is by {formatTime(hotel.checkOutTime)}, unless agreed otherwise with the hotel.
        </p>
        <h2>Payments</h2>
        <p>No payments are taken through this website. Payment is arranged directly with the hotel.</p>
        <h2>Photos and travel information</h2>
        <p>
          Some photos on this website show Jiri and its surroundings and are labelled as such; they are not photos of the hotel. Travel information about Jiri is
          general guidance only — transport schedules, fares and road conditions change, so please confirm them before you travel.
        </p>
        <h2>Contact</h2>
        <p>
          Questions about these terms? Email{" "}
          <a href={`mailto:${hotel.email}`} className="underline">
            {hotel.email}
          </a>
          .
        </p>
      </article>
    </>
  );
}
