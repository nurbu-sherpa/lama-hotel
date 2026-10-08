import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { CONTENT_TAG } from "@/config/site";
import { fillTokens, formatPhoneIntl, formatTime } from "@/lib/utils/format";

/**
 * Read-only data for the public website.
 * Results are cached and tagged with CONTENT_TAG; every admin save calls updateTag(CONTENT_TAG),
 * so changes made in the dashboard appear on the website immediately.
 */

const cacheOpts = { tags: [CONTENT_TAG], revalidate: 3600 };

/** Verified fallback values used only if the database has not been seeded yet. */
const DEFAULT_HOTEL = {
  name: "Lama Hotel & Lodge",
  tagline: "Your Comfortable Base in Jiri",
  description: "A comfortable lodge in Jiri Bazaar, Jiri, Nepal with 8 rooms, hot & cold shower anytime and free Wi-Fi.",
  phone: "9818486480",
  whatsapp: "+9779818486480",
  email: "sherpanurbu15@gmail.com",
  address: "Jiri Bazaar, Jiri, Nepal",
  locationDescription: "Right side of Hotel Paras, Jiri Bazaar",
  city: "Jiri",
  region: "Dolakha",
  country: "Nepal",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  googleMapsUrl: "https://maps.app.goo.gl/VEmr3HbrdMTYuPjE7",
  googleMapsEmbedUrl: "",
  googleBusinessUrl: "",
  facebookUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  notificationEmail: "",
  showPublicAvailability: false,
};
export type Hotel = typeof DEFAULT_HOTEL;

const hotelSelect = Object.fromEntries(Object.keys(DEFAULT_HOTEL).map((k) => [k, true])) as Record<keyof Hotel, true>;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("Database read failed", err);
    return fallback;
  }
}

const hotelCached = unstable_cache(
  async (): Promise<Hotel> => (await prisma.hotelSettings.findUnique({ where: { id: "default" }, select: hotelSelect })) ?? DEFAULT_HOTEL,
  ["hotel"],
  cacheOpts,
);
export const getHotel = () => safe(hotelCached, DEFAULT_HOTEL);

const DEFAULT_SEO = {
  siteTitle: "Lama Hotel & Lodge — Hotel in Jiri Bazaar, Nepal",
  titleTemplate: "%s | Lama Hotel & Lodge, Jiri",
  defaultDescription:
    "Lama Hotel & Lodge is a comfortable lodge in Jiri Bazaar, Jiri, Nepal. 8 rooms, hot & cold shower anytime and free Wi-Fi.",
  defaultOgImageUrl: "/images/placeholders/jiri-himalaya-view.jpg",
  googleSiteVerification: "",
};

const seoCached = unstable_cache(
  async () =>
        (await prisma.sEOSettings.findUnique({
          where: { id: "default" },
          select: { siteTitle: true, titleTemplate: true, defaultDescription: true, defaultOgImageUrl: true, googleSiteVerification: true },
        })) ?? DEFAULT_SEO,
  ["seo"],
  cacheOpts,
);
export const getSeo = () => safe(seoCached, DEFAULT_SEO);

const roomSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  description: true,
  price: true,
  currency: true,
  priceSuffix: true,
  bedDescription: true,
  capacityDescription: true,
  totalRooms: true,
  status: true,
  featured: true,
  metaTitle: true,
  metaDescription: true,
  images: { orderBy: { sortOrder: "asc" as const }, select: { id: true, url: true, alt: true, caption: true } },
};

const roomsCached = unstable_cache(async () => prisma.room.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: roomSelect }), ["rooms"], cacheOpts);
export const getRooms = () => safe(roomsCached, []);
export type PublicRoom = Awaited<ReturnType<typeof roomsCached>>[number];

export async function getRoom(slug: string) {
  const rooms = await getRooms();
  return rooms.find((r) => r.slug === slug) ?? null;
}

const facilitiesCached = unstable_cache(
  async () =>
        prisma.facility.findMany({
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, description: true, icon: true },
        }),
  ["facilities"],
  cacheOpts,
);
export const getFacilities = () => safe(facilitiesCached, []);

const galleryCached = unstable_cache(
  async () => {
        const [images, categories] = await Promise.all([
          prisma.galleryImage.findMany({
            orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
            select: {
              id: true,
              url: true,
              title: true,
              caption: true,
              alt: true,
              credit: true,
              isHotelPhoto: true,
              featured: true,
              category: { select: { slug: true, name: true } },
            },
          }),
          prisma.galleryCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
        ]);
        return { images, categories };
      },
  ["gallery"],
  cacheOpts,
);
export const getGallery = () => safe(galleryCached, { images: [], categories: [] });
export type PublicGalleryImage = Awaited<ReturnType<typeof galleryCached>>["images"][number];

export type PublicSection = {
  key: string;
  heading: string;
  body: string;
  imageUrl: string;
  imageAlt: string;
  imageCredit: string;
};
export type PublicPage = {
  slug: string;
  title: string;
  intro: string;
  metaTitle: string;
  metaDescription: string;
  sections: PublicSection[];
};

const pageCached = unstable_cache(
  async (slug: string): Promise<PublicPage | null> =>
        prisma.page.findUnique({
          where: { slug },
          select: {
            slug: true,
            title: true,
            intro: true,
            metaTitle: true,
            metaDescription: true,
            sections: {
              orderBy: { sortOrder: "asc" },
              select: { key: true, heading: true, body: true, imageUrl: true, imageAlt: true, imageCredit: true },
            },
          },
        }),
  ["page"],
  cacheOpts,
);
export const getPage = (slug: string) => safe(() => pageCached(slug), null);

/** Look up a fixed section (e.g. homepage "hero") by key. */
export function section(page: PublicPage | null, key: string): PublicSection {
  return page?.sections.find((s) => s.key === key) ?? { key, heading: "", body: "", imageUrl: "", imageAlt: "", imageCredit: "" };
}

const faqsCached = unstable_cache(
  async () =>
        prisma.fAQ.findMany({
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, question: true, answer: true },
        }),
  ["faqs"],
  cacheOpts,
);
const getFaqs = () => safe(faqsCached, []);

/** Values available as {{tokens}} in admin-written text such as FAQ answers. */
function hotelTokens(hotel: Hotel) {
  return {
    hotelName: hotel.name,
    phone: formatPhoneIntl(hotel.phone),
    whatsapp: formatPhoneIntl(hotel.whatsapp),
    email: hotel.email,
    address: hotel.address,
    location: hotel.locationDescription,
    checkInTime: formatTime(hotel.checkInTime),
    checkOutTime: formatTime(hotel.checkOutTime),
  };
}

export async function getFaqsResolved() {
  const [faqs, hotel] = await Promise.all([getFaqs(), getHotel()]);
  const tokens = hotelTokens(hotel);
  return faqs.map((f) => ({ ...f, answer: fillTokens(f.answer, tokens) }));
}
