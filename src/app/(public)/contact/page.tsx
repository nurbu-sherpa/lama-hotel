import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { getHotel } from "@/lib/data/public";
import { buildMetadata } from "@/lib/seo";
import { formatPhoneIntl, mailtoHref, telHref, whatsappHref } from "@/lib/utils/format";
import { WhatsAppIcon } from "@/components/shared/icons";
import { PageHeader } from "@/components/public/PageHeader";
import { ContactForm } from "@/components/forms/ContactForm";

export function generateMetadata() {
  return buildMetadata({ path: "/contact", pageSlug: "contact", title: "Contact Us" });
}

export default async function ContactPage() {
  const hotel = await getHotel();
  // Each row is one large, clearly labelled action (Call / WhatsApp / Email / Get Directions).
  const rows = [
    { Icon: Phone, label: "Phone", action: "Call", value: formatPhoneIntl(hotel.phone), href: telHref(hotel.phone), external: false },
    { Icon: WhatsAppIcon, label: "WhatsApp", action: "WhatsApp", value: formatPhoneIntl(hotel.whatsapp), href: whatsappHref(hotel.whatsapp), external: true },
    { Icon: Mail, label: "Email", action: "Email", value: hotel.email, href: mailtoHref(hotel.email), external: false },
    {
      Icon: MapPin,
      label: "Address",
      action: "Get Directions",
      value: `${hotel.address}${hotel.locationDescription ? ` — ${hotel.locationDescription}` : ""}`,
      href: hotel.googleMapsUrl,
      external: true,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        crumbs={[{ name: "Contact", path: "/contact" }]}
        intro={<p>Questions about rooms, availability or getting to Jiri? We&apos;re happy to help.</p>}
      />

      <section className="container-page grid gap-14 py-14 sm:py-20 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h2 className="font-display text-[1.9rem] font-medium text-forest-900">{hotel.name}</h2>
          <p className="mt-2 text-muted">The quickest way to reach us is by phone or WhatsApp.</p>
          <ul className="mt-6 border-t border-cream-300/80">
            {rows.map(({ Icon, label, action, value, href, external }) => (
              <li key={label} className="border-b border-cream-300/80">
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group flex min-h-16 items-center gap-4 py-4 transition-colors hover:bg-cream-100/60"
                >
                  <Icon size={22} aria-hidden className="shrink-0 text-clay-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold tracking-wide text-muted uppercase">{label}</span>
                    <span className="block text-[1.08rem] font-semibold break-words text-forest-900 group-hover:text-clay-700">{value}</span>
                  </span>
                  <span className="hidden shrink-0 text-sm font-semibold text-forest-700 sm:block">{action} →</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-7">
          <h2 className="font-display text-[1.9rem] font-medium text-forest-900">Send us a message</h2>
          <p className="mt-2 mb-6 text-muted">
            For room requests, please use the{" "}
            <Link href="/booking" className="link-quiet">
              booking inquiry form
            </Link>
            .
          </p>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
