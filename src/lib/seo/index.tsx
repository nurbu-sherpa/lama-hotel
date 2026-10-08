import type { Metadata } from "next";
import { siteUrl } from "@/config/site";
import { getGallery, getHotel, getPage, getRooms, getSeo, getFacilities, type Hotel } from "@/lib/data/public";
import { formatPhoneIntl, phoneDigits } from "@/lib/utils/format";

const absoluteUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${siteUrl}${path.startsWith("/") ? "" : "/"}${path}`);

/**
 * Build page metadata. Title/description can be overridden per page in Admin → SEO.
 */
export async function buildMetadata(opts: {
  path: string;
  pageSlug?: string;
  title?: string;
  description?: string;
  image?: string;
  absoluteTitle?: boolean;
}): Promise<Metadata> {
  const [seo, page] = await Promise.all([getSeo(), opts.pageSlug ? getPage(opts.pageSlug) : Promise.resolve(null)]);
  const title = page?.metaTitle || opts.title || seo.siteTitle;
  const description = page?.metaDescription || opts.description || seo.defaultDescription;
  const image = absoluteUrl(opts.image || seo.defaultOgImageUrl || "/images/placeholders/jiri-himalaya-view.jpg");
  const url = absoluteUrl(opts.path);
  const fullTitle = opts.absoluteTitle ? title : seo.titleTemplate.replace("%s", title);

  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "Lama Hotel & Lodge",
      locale: "en_US",
      url,
      title: fullTitle,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: "Jiri, Nepal" }],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image] },
  };
}

function sameAs(hotel: Hotel) {
  return [hotel.googleBusinessUrl, hotel.facebookUrl, hotel.instagramUrl, hotel.tiktokUrl, hotel.youtubeUrl].filter(Boolean);
}

/** Hotel (⊂ LodgingBusiness ⊂ LocalBusiness) structured data — real data only. No ratings, reviews, stars or coordinates. */
export async function hotelJsonLd() {
  const [hotel, rooms, facilities, gallery] = await Promise.all([getHotel(), getRooms(), getFacilities(), getGallery()]);
  // Only real photos of the hotel may represent the business — never destination placeholder imagery.
  const hotelPhotos = gallery.images.filter((i) => i.isHotelPhoto).map((i) => absoluteUrl(i.url));
  const prices = rooms.map((r) => r.price);
  const currency = rooms[0]?.currency ?? "NPR";
  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "@id": `${siteUrl}/#hotel`,
    name: hotel.name,
    description: hotel.description,
    url: siteUrl,
    telephone: `+${phoneDigits(hotel.phone)}`,
    email: hotel.email,
    ...(hotelPhotos.length ? { image: hotelPhotos.slice(0, 5) } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: [hotel.locationDescription].filter(Boolean).join(", ") || hotel.address,
      addressLocality: hotel.city,
      ...(hotel.region ? { addressRegion: hotel.region } : {}),
      addressCountry: "NP",
    },
    hasMap: hotel.googleMapsUrl,
    checkinTime: hotel.checkInTime,
    checkoutTime: hotel.checkOutTime,
    numberOfRooms: rooms.reduce((n, r) => n + r.totalRooms, 0),
    ...(prices.length
      ? { priceRange: `${currency} ${Math.min(...prices).toLocaleString("en-US")}–${Math.max(...prices).toLocaleString("en-US")} per room`, currenciesAccepted: currency }
      : {}),
    amenityFeature: facilities.map((f) => ({ "@type": "LocationFeatureSpecification", name: f.name, value: true })),
    containsPlace: rooms.map((r) => ({
      "@type": "HotelRoom",
      name: r.name,
      url: absoluteUrl(`/rooms/${r.slug}`),
      bed: r.bedDescription,
    })),
    makesOffer: rooms.map((r) => ({
      "@type": "Offer",
      name: r.name,
      url: absoluteUrl(`/rooms/${r.slug}`),
      priceSpecification: { "@type": "UnitPriceSpecification", price: r.price, priceCurrency: r.currency, unitText: "room" },
    })),
    contactPoint: { "@type": "ContactPoint", telephone: formatPhoneIntl(hotel.phone), email: hotel.email, contactType: "reservations" },
    ...(sameAs(hotel).length ? { sameAs: sameAs(hotel) } : {}),
  };
}

export async function websiteJsonLd() {
  const hotel = await getHotel();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: hotel.name,
    inLanguage: "en",
    publisher: { "@id": `${siteUrl}/#hotel` },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** Renders JSON-LD safely (escapes "<" so content can't break out of the script tag). */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
