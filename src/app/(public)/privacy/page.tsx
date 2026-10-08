import { getHotel } from "@/lib/data/public";
import { buildMetadata } from "@/lib/seo";
import { formatPhoneIntl } from "@/lib/utils/format";
import { PageHeader } from "@/components/public/PageHeader";

export function generateMetadata() {
  return buildMetadata({ path: "/privacy", title: "Privacy Policy", description: "How Lama Hotel & Lodge handles the information you send through this website." });
}

export default async function PrivacyPage() {
  const hotel = await getHotel();
  return (
    <>
      <PageHeader title="Privacy Policy" crumbs={[{ name: "Privacy", path: "/privacy" }]} />
      <article className="container-page prose-lodge max-w-3xl py-12 sm:py-16 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-forest-900">
        <p>
          This page explains what information {hotel.name} collects through this website and how we use it. We keep things simple: we only collect what we need to
          answer your inquiry.
        </p>
        <h2>What we collect</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Booking inquiries:</strong> your name, email, phone number, country, travel dates, number of guests and rooms, and any message or arrival
            information you choose to add.
          </li>
          <li>
            <strong>Contact messages:</strong> your name, email, optional phone number and your message.
          </li>
          <li>
            <strong>Basic technical data:</strong> to prevent spam, we store a one-way, scrambled code derived from your IP address. We do not store your IP
            address itself.
          </li>
        </ul>
        <h2>How we use it</h2>
        <p>
          We use your information only to reply to your inquiry, confirm availability and arrange your stay. We do not sell your information or use it for
          advertising. We do not take payments or store payment details on this website.
        </p>
        <h2>How long we keep it</h2>
        <p>
          We keep booking inquiries and messages only as long as we need them to arrange your stay and keep our booking records. You can ask us to delete
          them at any time (see below). Technical security logs are deleted automatically after 30 to 90 days.
        </p>
        <h2>Cookies</h2>
        <p>This website does not use advertising or tracking cookies. A secure session cookie is used only for the hotel&apos;s private admin area.</p>
        <h2>Third-party services</h2>
        <p>
          Links to Google Maps and WhatsApp open those services, which have their own privacy policies. The booking and contact forms use Cloudflare Turnstile
          to check that a real person (not a spam robot) is sending them. Website hosting and image storage are provided by trusted service providers.
        </p>
        <h2>Your choices</h2>
        <p>
          You can ask us to correct or delete the information you sent us at any time by contacting us at{" "}
          <a href={`mailto:${hotel.email}`} className="underline">
            {hotel.email}
          </a>{" "}
          or {formatPhoneIntl(hotel.phone)}.
        </p>
      </article>
    </>
  );
}
