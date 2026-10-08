import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, Camera, DoorOpen, MapPin, Phone, ShowerHead, Wifi, Banknote } from "lucide-react";
import { getFacilities, getFaqsResolved, getGallery, getHotel, getPage, getRooms, section } from "@/lib/data/public";
import { buildMetadata, hotelJsonLd, JsonLd, websiteJsonLd } from "@/lib/seo";
import { getPublicAvailability } from "@/lib/data/availability";
import { Markdown, markdownToPlain } from "@/lib/markdown";
import { formatPhoneIntl, formatPrice, formatTime, telHref, whatsappHref } from "@/lib/utils/format";
import { RoomCard } from "@/components/public/RoomCard";
import { CTASection } from "@/components/public/CTASection";
import { LocationCard } from "@/components/public/LocationCard";
import { ImageCredit } from "@/components/public/ImageCredit";
import { SectionHeading } from "@/components/public/SectionHeading";
import { FAQAccordion } from "@/components/public/FAQAccordion";
import { FacilityIcon } from "@/components/shared/icons";

export function generateMetadata() {
  return buildMetadata({ path: "/", pageSlug: "home", absoluteTitle: true });
}

function firstSentence(md: string, max = 150) {
  const plain = markdownToPlain(md);
  const s = plain.match(/^.*?[.!?](\s|$)/)?.[0]?.trim() ?? plain;
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

export default async function HomePage() {
  const [hotel, home, rooms, facilities, hotelLd, siteLd, availability, thingsToDo, gallery, faqs] = await Promise.all([
    getHotel(),
    getPage("home"),
    getRooms(),
    getFacilities(),
    hotelJsonLd(),
    websiteJsonLd(),
    getPublicAvailability(),
    getPage("jiri-things-to-do"),
    getGallery(),
    getFaqsResolved(),
  ]);

  const hero = section(home, "hero");
  const heroSubtitle = section(home, "hero_subtitle");
  const welcome = section(home, "welcome");
  const roomsTitle = section(home, "rooms_title");
  const facilitiesTitle = section(home, "facilities_title");
  const jiri = section(home, "jiri");
  const cta = section(home, "cta");

  const totalRooms = rooms.reduce((n, r) => n + r.totalRooms, 0);
  const lowestPrice = rooms.length ? rooms.reduce((a, b) => (b.price < a.price ? b : a)) : null;
  const activities = (thingsToDo?.sections ?? []).filter((s) => s.imageUrl).slice(0, 3);
  const galleryPicks = [...gallery.images.filter((i) => i.featured), ...gallery.images.filter((i) => !i.featured)].slice(0, 5);
  const hasHotelPhotos = gallery.images.some((i) => i.isHotelPhoto);

  // Quick benefits — verified facts only (room count comes from the database).
  const benefits = [
    { Icon: DoorOpen, label: `${totalRooms} Rooms`, detail: rooms.map((r) => `${r.totalRooms} ${r.name.replace(/\s+Room$/, "")}`).join(" · ") },
    { Icon: ShowerHead, label: "Hot & Cold Shower Anytime", detail: "Day or night" },
    { Icon: Wifi, label: "Free Wi-Fi", detail: "For all guests" },
    { Icon: MapPin, label: "Jiri Bazaar Location", detail: hotel.locationDescription || hotel.address },
  ];

  // "Why stay with us" — confirmed facilities from the database plus plain facts about location and pricing.
  const reasons = [
    ...facilities.map((f) => ({ key: f.id, icon: <FacilityIcon name={f.icon} size={22} />, title: f.name, text: f.description })),
    {
      key: "location",
      icon: <MapPin size={22} aria-hidden />,
      title: "In the middle of Jiri Bazaar",
      text: `${hotel.locationDescription || hotel.address} — close to where buses and jeeps arrive.`,
    },
    {
      key: "price",
      icon: <Banknote size={22} aria-hidden />,
      title: "Simple per-room prices",
      text: "You pay per room, not per person. Tell us your group size and we'll suggest the best arrangement.",
    },
    {
      key: "contact",
      icon: <Phone size={22} aria-hidden />,
      title: "Talk to us directly",
      text: `Call or WhatsApp ${formatPhoneIntl(hotel.phone)} with any question before you travel.`,
    },
  ];

  return (
    <>
      <JsonLd data={hotelLd} />
      <JsonLd data={siteLd} />

      {/* ── Hero ── */}
      <section
        aria-labelledby="hero-title"
        className="relative isolate flex min-h-[calc(100svh-9rem)] items-end overflow-hidden bg-forest-950 sm:min-h-[36rem] lg:min-h-[calc(100svh-4.5rem)] lg:max-h-[52rem]"
      >
        {hero.imageUrl && <Image src={hero.imageUrl} alt={hero.imageAlt} fill preload sizes="100vw" className="hero-zoom -z-10 object-cover object-[50%_40%]" />}
        {/* Light overlay: keep the mountains visible, darken only behind the text. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-950/90 via-forest-950/35 to-forest-950/5" />
        <div className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-forest-950/55 to-transparent lg:block" />

        <div className="container-page pt-28 pb-12 sm:pb-16 lg:pb-20">
          <p className="hero-in flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-cream-100 uppercase" style={{ "--d": 0 } as CSSProperties}>
            <MapPin size={15} aria-hidden className="text-clay-300" />
            {hotel.address}
          </p>
          <h1 id="hero-title" className="hero-in mt-4 max-w-3xl font-display text-[2.9rem] leading-[1] font-medium tracking-tight text-white sm:text-6xl lg:text-7xl" style={{ "--d": 1 } as CSSProperties}>
            {hero.heading || hotel.name}
          </h1>
          <p className="hero-in mt-4 font-display text-2xl font-normal text-cream-100 italic sm:text-[1.9rem]" style={{ "--d": 2 } as CSSProperties}>{hero.body || hotel.tagline}</p>
          {heroSubtitle.body && <p className="hero-in mt-5 max-w-xl text-[1.1rem] leading-relaxed text-cream-100/90" style={{ "--d": 3 } as CSSProperties}>{heroSubtitle.body}</p>}

          <div className="hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ "--d": 4 } as CSSProperties}>
            <Link href="/booking" className="btn-primary !min-h-12 !px-7 text-base">
              Check Availability
            </Link>
            <Link href="/rooms" className="btn-ghost-light !min-h-12 !px-6 text-base">
              View Rooms &amp; Prices
            </Link>
          </div>
          <p className="hero-in mt-6 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.95rem] text-cream-100/90" style={{ "--d": 5 } as CSSProperties}>
            <a href={telHref(hotel.phone)} className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:text-white hover:underline">
              <Phone size={16} aria-hidden /> Call Us {formatPhoneIntl(hotel.phone)}
            </a>
            <a href={whatsappHref(hotel.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-white hover:underline">
              WhatsApp
            </a>
            <a href={hotel.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-white hover:underline">
              Get Directions
            </a>
          </p>
        </div>
        {hero.imageCredit && <ImageCredit text={hero.imageCredit} className="absolute right-3 bottom-2" />}
      </section>

      {/* ── Introduction + quick benefits ── */}
      <section aria-labelledby="welcome-heading" className="bg-cream-50">
        <div className="container-page grid gap-10 py-20 sm:py-24 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="eyebrow">Welcome</p>
            <h2 id="welcome-heading" className="heading-section mt-3">
              {welcome.heading}
            </h2>
          </div>
          <div className="lg:col-span-7">
            <Markdown text={welcome.body} />
            <p className="mt-6 text-[0.95rem] text-muted">
              Check-in from <strong className="font-semibold text-ink">{formatTime(hotel.checkInTime)}</strong> · Check-out by{" "}
              <strong className="font-semibold text-ink">{formatTime(hotel.checkOutTime)}</strong>
            </p>
          </div>
        </div>
        <div className="container-page pb-20 sm:pb-24">
          <ul aria-label="At a glance" className="grid gap-px overflow-hidden border-y border-cream-300/80 bg-cream-300/80 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ Icon, label, detail }) => (
              <li key={label} className="flex gap-4 bg-cream-50 py-6 sm:px-6">
                <Icon size={24} aria-hidden className="mt-0.5 shrink-0 text-clay-600" strokeWidth={1.6} />
                <div>
                  <p className="font-semibold text-forest-900">{label}</p>
                  <p className="mt-0.5 text-sm text-muted">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Featured rooms ── */}
      <section aria-labelledby="rooms-heading" className="border-t border-cream-200 bg-cream-100/70 py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading
            id="rooms-heading"
            eyebrow="Rooms & prices"
            title={roomsTitle.heading || "Our Rooms"}
            intro={
              <>
                {roomsTitle.body}
                {lowestPrice && (
                  <span className="mt-2 block text-base">
                    From <strong className="font-semibold text-forest-900">{formatPrice(lowestPrice.price, lowestPrice.currency)}</strong> {lowestPrice.priceSuffix}.
                  </span>
                )}
              </>
            }
            action={{ href: "/rooms", label: "Compare rooms" }}
          />
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:gap-10">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} availability={availability?.find((a) => a.slug === room.slug)} facilities={facilities} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Why stay with us ── */}
      <section aria-labelledby="why-heading" className="py-20 sm:py-28">
        <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <SectionHeading stacked id="why-heading" eyebrow="Why stay with us" title={facilitiesTitle.heading || "What we offer"} intro={facilitiesTitle.body || undefined} />
          </div>
          <ul className="grid gap-x-10 sm:grid-cols-2 lg:col-span-8">
            {reasons.map((r) => (
              <li key={r.key} className="flex gap-4 border-t border-cream-300/80 py-6">
                <span className="mt-0.5 shrink-0 text-forest-600">{r.icon}</span>
                <div>
                  <h3 className="font-display text-xl font-medium text-forest-900">{r.title}</h3>
                  {r.text && <p className="mt-1.5 leading-relaxed text-muted">{r.text}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Discover Jiri ── */}
      <section aria-labelledby="jiri-heading" className="bg-forest-900 text-white">
        <div className="container-page grid items-center gap-10 py-20 sm:py-28 lg:grid-cols-12 lg:gap-16">
          {jiri.imageUrl && (
            <figure className="reveal relative aspect-[4/3] overflow-hidden rounded-md lg:col-span-6">
              <Image src={jiri.imageUrl} alt={jiri.imageAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
              {jiri.imageCredit && <ImageCredit text={jiri.imageCredit} className="absolute right-2 bottom-2" />}
            </figure>
          )}
          <div className="lg:col-span-6">
            <SectionHeading id="jiri-heading" tone="dark" eyebrow="The destination" title={jiri.heading || "Discover Jiri"} />
            <Markdown text={jiri.body} className="mt-5 max-w-[60ch] space-y-4 text-lg leading-relaxed text-cream-100/85" />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/jiri" className="btn-primary">
                About Jiri <ArrowRight size={17} aria-hidden />
              </Link>
              <Link href="/jiri/how-to-reach" className="btn-ghost-light">
                How to reach Jiri
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Things to do ── */}
      {activities.length > 0 && (
        <section aria-labelledby="todo-heading" className="py-20 sm:py-28">
          <div className="container-page">
            <SectionHeading id="todo-heading" eyebrow="While you're here" title={thingsToDo?.title || "Things to do in Jiri"} action={{ href: "/jiri/things-to-do", label: "All ideas" }} />
            <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {activities.map((a) => (
                <li key={a.key} className="reveal group">
                  <Link href={`/jiri/things-to-do#s-${a.key}`} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-cream-200">
                      <Image src={a.imageUrl} alt={a.imageAlt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-[1.06]" />
                      <span className="absolute top-3 left-3 rounded-sm bg-white/90 px-2 py-0.5 text-xs font-semibold text-forest-900">Jiri area</span>
                    </div>
                    <h3 className="mt-5 font-display text-2xl font-medium text-forest-900 group-hover:text-clay-700">{a.heading}</h3>
                    <p className="mt-2 leading-relaxed text-muted">{firstSentence(a.body)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Gallery ── */}
      {galleryPicks.length > 0 && (
        <section aria-labelledby="gallery-heading" className="border-t border-cream-200 bg-cream-100/70 py-20 sm:py-28">
          <div className="container-page">
            <SectionHeading
              id="gallery-heading"
              eyebrow="Gallery"
              title={hasHotelPhotos ? "The lodge & Jiri" : "Jiri & its surroundings"}
              intro={
                !hasHotelPhotos ? (
                  <span className="inline-flex items-start gap-2 text-base">
                    <Camera size={18} aria-hidden className="mt-1 shrink-0 text-clay-600" />
                    Photos of the lodge are coming soon. These images show Jiri — they are not photos of the hotel.
                  </span>
                ) : undefined
              }
              action={{ href: "/gallery", label: "Open gallery" }}
            />
            <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
              {galleryPicks.map((img, i) => (
                <li key={img.id} className={`relative overflow-hidden rounded-md bg-cream-200 ${i === 0 ? "col-span-2 aspect-[4/3] lg:row-span-2 lg:aspect-auto" : "aspect-square"}`}>
                  <Link href="/gallery" aria-label={`${img.title} — open gallery`} className="group relative block h-full">
                    <Image src={img.url} alt={img.alt} fill sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"} className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-[1.06]" />
                    <span className="absolute bottom-2 left-2 rounded-sm bg-black/55 px-2 py-0.5 text-[0.7rem] font-medium text-white">
                      {img.isHotelPhoto ? "At the lodge" : img.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Location ── */}
      <section aria-labelledby="location-heading" className="py-20 sm:py-28">
        <div className="container-page grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              stacked
              id="location-heading"
              eyebrow="Find us"
              title="In the heart of Jiri Bazaar"
              intro={`${hotel.locationDescription ? `${hotel.locationDescription}. ` : ""}Easy to find when you arrive in Jiri — call us if you need help with directions.`}
              action={{ href: "/location", label: "Location details" }}
            />
          </div>
          <div className="lg:col-span-7">
            <LocationCard hotel={hotel} headingLevel="h3" />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      {faqs.length > 0 && (
        <section aria-labelledby="faq-heading" className="border-t border-cream-200 py-20 sm:py-28">
          <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <SectionHeading stacked id="faq-heading" eyebrow="Good to know" title="Questions guests ask" action={{ href: "/faq", label: "All questions" }} />
            </div>
            <div className="reveal lg:col-span-8">
              <FAQAccordion faqs={faqs.slice(0, 5)} />
            </div>
          </div>
        </section>
      )}

      <CTASection hotel={hotel} heading={cta.heading || "Planning a stay in Jiri?"} body={cta.body} />
    </>
  );
}
