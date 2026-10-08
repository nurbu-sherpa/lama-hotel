/**
 * Seed script — real, owner-supplied data only.
 *
 * Safe to re-run: existing rows are left untouched (upsert with empty update),
 * so the owner's edits made in the admin dashboard are never overwritten.
 *
 * Usage:  npm run db:seed
 * Requires ADMIN_EMAIL and ADMIN_PASSWORD in the environment to create the first admin.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const HOTEL = {
  name: "Lama Hotel & Lodge",
  tagline: "Your Comfortable Base in Jiri",
  description:
    "Lama Hotel & Lodge is a small, friendly lodge in Jiri Bazaar, Jiri, Nepal. We offer 8 rooms, hot and cold showers anytime and free Wi-Fi — a comfortable place to rest for travellers visiting Jiri.",
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
};

// Temporary destination imagery (Wikimedia Commons, Creative Commons licences).
// These are photos of Jiri and its surroundings — NOT photos of the hotel.
const PLACEHOLDERS = {
  himalaya: {
    url: "/images/placeholders/jiri-himalaya-view.jpg",
    title: "Himalayan peaks seen from near Jiri",
    alt: "Snow-covered Himalayan peaks rising above forested hills near Jiri, Dolakha",
    caption: "Snow peaks seen from the hills near Jiri, Dolakha.",
    credit: "Photo: Sundar1, CC BY-SA 3.0, via Wikimedia Commons",
    category: "mountains",
  },
  bazaar: {
    url: "/images/placeholders/jiri-bazaar-street.jpg",
    title: "Main street of Jiri Bazaar",
    alt: "The main street of Jiri Bazaar with shops and forested hills behind",
    caption: "The main street in Jiri Bazaar.",
    credit: "Photo: Sundar1, CC BY-SA 3.0, via Wikimedia Commons",
    category: "jiri",
  },
  morning: {
    url: "/images/placeholders/jiri-bazaar-morning.jpg",
    title: "Early morning in Jiri",
    alt: "Early morning view over Jiri Bazaar with prayer flags and a forested hillside",
    caption: "Early morning in Jiri.",
    credit: "Photo: Sundar1, CC BY-SA 3.0, via Wikimedia Commons",
    category: "jiri",
  },
  panorama: {
    url: "/images/placeholders/jiri-hills-panorama.jpg",
    title: "View from the hills above Jiri",
    alt: "Layered blue hills and valleys seen from a snowy ridge above Jiri",
    caption: "Looking out over the hills from high above Jiri.",
    credit: "Photo: Rajukunwar, CC BY-SA 4.0, via Wikimedia Commons",
    category: "surroundings",
  },
  ridge: {
    url: "/images/placeholders/jiri-snowy-ridge.jpg",
    title: "Winter snow on a ridge near Jiri",
    alt: "Snow-covered open ridge with prayer flags and a small pond under a deep blue sky near Jiri",
    caption: "A winter day on the ridges around Jiri.",
    credit: "Photo: Rajukunwar, CC BY-SA 4.0, via Wikimedia Commons",
    category: "surroundings",
  },
  fields: {
    url: "/images/placeholders/jiri-millet-fields.jpg",
    title: "Millet fields and marigolds in Jiri",
    alt: "Marigold flowers in front of a green millet field on a hillside in Jiri",
    caption: "Millet fields and marigolds — farmland around Jiri.",
    credit: "Photo: Tabindra, CC BY-SA 3.0, via Wikimedia Commons",
    category: "travel",
  },
} as const;

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("⚠ ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin user creation.");
    return;
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  }
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ Admin user ${email} already exists (password unchanged).`);
    return;
  }
  await prisma.adminUser.create({
    data: {
      email,
      name: "Hotel Owner",
      passwordHash: await bcrypt.hash(password, 12),
      role: "OWNER",
    },
  });
  console.log(`✓ Created admin user ${email}`);
}

async function seedSettings() {
  await prisma.hotelSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", ...HOTEL },
  });
  await prisma.sEOSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      siteTitle: "Lama Hotel & Lodge — Hotel in Jiri Bazaar, Nepal",
      titleTemplate: "%s | Lama Hotel & Lodge, Jiri",
      defaultDescription:
        "Lama Hotel & Lodge is a comfortable lodge in Jiri Bazaar, Jiri, Nepal. 8 rooms, hot & cold shower anytime and free Wi-Fi. Standard rooms from NPR 1,200 per room.",
      defaultOgImageUrl: PLACEHOLDERS.himalaya.url,
    },
  });
  console.log("✓ Hotel & SEO settings");
}

async function seedRooms() {
  const rooms = [
    {
      slug: "standard-room",
      name: "Standard Room",
      shortDescription: "A simple, comfortable room with two beds — good value in the heart of Jiri Bazaar.",
      description:
        "Our Standard Rooms are simple and comfortable, with two 4 × 6 ft beds in each room.\n\nGuests have hot and cold showers available anytime and free Wi-Fi.\n\nThe price is per room, not per person. Tell us how many people are travelling when you send your inquiry and we will confirm what works best for your group.",
      price: 1200,
      bedDescription: "Two 4 × 6 ft beds",
      capacityDescription: "Let us know your group size and we'll confirm the best arrangement.",
      totalRooms: 6,
      featured: true,
      sortOrder: 1,
      metaTitle: "Standard Room — NPR 1,200 per room",
      metaDescription:
        "Standard Room at Lama Hotel & Lodge, Jiri Bazaar: two 4 × 6 ft beds, hot & cold shower anytime, free Wi-Fi. NPR 1,200 per room.",
    },
    {
      slug: "special-room",
      name: "Special Room",
      shortDescription: "One of our two Special Rooms — two beds and a little extra, in central Jiri Bazaar.",
      description:
        "We have two Special Rooms, each with two 4 × 6 ft beds.\n\nGuests have hot and cold showers available anytime and free Wi-Fi.\n\nThe price is per room, not per person. Send us an inquiry with your dates and group size, and we will confirm availability.",
      price: 1500,
      bedDescription: "Two 4 × 6 ft beds",
      capacityDescription: "Let us know your group size and we'll confirm the best arrangement.",
      totalRooms: 2,
      featured: true,
      sortOrder: 2,
      metaTitle: "Special Room — NPR 1,500 per room",
      metaDescription:
        "Special Room at Lama Hotel & Lodge, Jiri Bazaar: two 4 × 6 ft beds, hot & cold shower anytime, free Wi-Fi. NPR 1,500 per room.",
    },
  ];
  const codes: Record<string, string> = { "standard-room": "STD", "special-room": "SPC" };
  for (const room of rooms) {
    const row = await prisma.room.upsert({ where: { slug: room.slug }, update: {}, create: { ...room, currency: "NPR" } });
    // Individual physical rooms (e.g. "Standard 1" … "Standard 6"). Only created if none exist yet.
    if ((await prisma.roomUnit.count({ where: { roomId: row.id } })) === 0) {
      const base = room.name.replace(/\s+Room$/, "");
      await prisma.roomUnit.createMany({
        data: Array.from({ length: room.totalRooms }, (_, i) => ({
          roomId: row.id,
          name: `${base} ${i + 1}`,
          code: `${codes[room.slug]}-${i + 1}`,
          sortOrder: i + 1,
        })),
      });
    }
    // Inventory always equals the number of active physical rooms.
    const active = await prisma.roomUnit.count({ where: { roomId: row.id, active: true } });
    await prisma.room.update({ where: { id: row.id }, data: { totalRooms: active } });
  }
  console.log("✓ Rooms (Standard ×6, Special ×2) and 8 physical rooms");
}

async function seedFacilities() {
  if ((await prisma.facility.count()) > 0) return console.log("✓ Facilities (already present)");
  await prisma.facility.createMany({
    data: [
      {
        name: "Hot & cold shower anytime",
        description: "Hot and cold water is available for showers at any time of day.",
        icon: "shower",
        sortOrder: 1,
      },
      { name: "Free Wi-Fi", description: "Stay connected with free Wi-Fi for guests.", icon: "wifi", sortOrder: 2 },
    ],
  });
  console.log("✓ Facilities");
}

async function seedGallery() {
  const categories = [
    { slug: "hotel", name: "Hotel" },
    { slug: "rooms", name: "Rooms" },
    { slug: "jiri", name: "Jiri" },
    { slug: "mountains", name: "Mountains" },
    { slug: "surroundings", name: "Surroundings" },
    { slug: "travel", name: "Travel" },
  ];
  const catIds: Record<string, string> = {};
  for (const [i, c] of categories.entries()) {
    const row = await prisma.galleryCategory.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, sortOrder: i + 1 },
    });
    catIds[c.slug] = row.id;
  }
  if ((await prisma.galleryImage.count()) > 0) return console.log("✓ Gallery (already present)");
  const order = [PLACEHOLDERS.himalaya, PLACEHOLDERS.bazaar, PLACEHOLDERS.panorama, PLACEHOLDERS.fields, PLACEHOLDERS.morning, PLACEHOLDERS.ridge];
  await prisma.galleryImage.createMany({
    data: order.map((p, i) => ({
      url: p.url,
      title: p.title,
      alt: p.alt,
      caption: p.caption,
      credit: p.credit,
      isHotelPhoto: false,
      featured: i < 4,
      sortOrder: i + 1,
      categoryId: catIds[p.category],
    })),
  });
  console.log("✓ Gallery categories & temporary Jiri imagery");
}

type SectionSeed = {
  key: string;
  heading?: string;
  body?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageCredit?: string;
};

async function upsertPage(
  slug: string,
  data: { title: string; intro?: string; metaTitle?: string; metaDescription?: string },
  sections: SectionSeed[] = [],
) {
  const page = await prisma.page.upsert({ where: { slug }, update: {}, create: { slug, ...data } });
  for (const [i, s] of sections.entries()) {
    await prisma.pageSection.upsert({
      where: { pageId_key: { pageId: page.id, key: s.key } },
      update: {},
      create: { pageId: page.id, sortOrder: i + 1, ...s },
    });
  }
}

async function seedPages() {
  // Homepage — every piece of marketing copy lives here and is editable in Admin → Homepage.
  await upsertPage(
    "home",
    {
      title: "Home",
      metaTitle: "Lama Hotel & Lodge — Hotel in Jiri Bazaar, Jiri, Nepal",
      metaDescription:
        "Stay at Lama Hotel & Lodge in Jiri Bazaar, Nepal. 8 comfortable rooms, hot & cold shower anytime and free Wi-Fi. Rooms from NPR 1,200 per room. Call or WhatsApp +977 9818486480.",
    },
    [
      {
        key: "hero",
        heading: "Lama Hotel & Lodge",
        body: "Your Comfortable Base in Jiri",
        imageUrl: PLACEHOLDERS.himalaya.url,
        imageAlt: PLACEHOLDERS.himalaya.alt,
        imageCredit: `Himalayan view near Jiri. ${PLACEHOLDERS.himalaya.credit}`,
      },
      {
        key: "hero_subtitle",
        heading: "Hero supporting text",
        body: "Comfortable rooms in the middle of Jiri Bazaar, with hot & cold showers anytime and free Wi-Fi — a friendly place to rest for travellers visiting Jiri.",
      },
      {
        key: "welcome",
        heading: "Welcome to Lama Hotel & Lodge",
        body: "We are a small lodge in **Jiri Bazaar**, right beside Hotel Paras, with eight rooms for travellers passing through or staying a while in Jiri.\n\nOur rooms are simple and comfortable, each with two beds. Hot and cold showers are available anytime, and Wi-Fi is free for guests.\n\nRoom prices are **per room, not per person**. Send us an inquiry, call or message us on WhatsApp, and we'll confirm availability for your dates.",
      },
      { key: "rooms_title", heading: "Our Rooms", body: "Eight rooms in two types. Prices are per room — not per person." },
      { key: "facilities_title", heading: "What we offer", body: "" },
      {
        key: "jiri",
        heading: "Discover Jiri",
        body: "Jiri is a hill town in Nepal's Dolakha District, long known as a gateway on the classic walking route toward the Everest region. Wander Jiri Bazaar, enjoy the green hills and farmland, and on clear days look out for Himalayan peaks.",
        imageUrl: PLACEHOLDERS.bazaar.url,
        imageAlt: PLACEHOLDERS.bazaar.alt,
        imageCredit: `Jiri Bazaar. ${PLACEHOLDERS.bazaar.credit}`,
      },
      {
        key: "cta",
        heading: "Planning a stay in Jiri?",
        body: "Send us your dates and we'll get back to you to confirm availability. You can also call or message us on WhatsApp.",
      },
      {
        key: "footer",
        heading: "Footer text",
        body: "A comfortable, friendly lodge in Jiri Bazaar, Jiri, Nepal.",
      },
    ],
  );

  // Jiri guide pages — general, non-time-sensitive information. Editable in Admin → Jiri Guide.
  await upsertPage(
    "jiri",
    {
      title: "About Jiri, Nepal",
      intro:
        "Jiri is a hill town in Dolakha District, eastern Nepal — a market town for the surrounding villages and a well-known starting point on the old walking route toward the Everest region.",
      metaTitle: "Jiri, Nepal — Travel Guide & Where to Stay",
      metaDescription:
        "A practical introduction to Jiri, Nepal: Jiri Bazaar, the hills and mountain views, the classic trekking route and tips for visitors. Stay at Lama Hotel & Lodge in Jiri Bazaar.",
    },
    [
      {
        key: "overview",
        heading: "Jiri at a glance",
        body: "Jiri sits in the green middle hills of **Dolakha District**, at roughly 1,900 metres above sea level. The town is spread along a valley floor surrounded by forested ridges and terraced farmland.\n\nFor many years Jiri was the road-head where trekkers began the long walk toward Solukhumbu and the Everest region. Today most visitors to the Everest region fly to Lukla, but the walk-in from Jiri remains a classic route, and many travellers still pass through — some starting or ending a trek, others visiting family, working in the area, or simply enjoying a quieter part of Nepal.\n\nJiri is also home to the **Jirel** community, along with Sherpa, Tamang, and other communities who live in the surrounding hills.",
        imageUrl: PLACEHOLDERS.morning.url,
        imageAlt: PLACEHOLDERS.morning.alt,
        imageCredit: PLACEHOLDERS.morning.credit,
      },
      {
        key: "bazaar",
        heading: "Jiri Bazaar",
        body: "Jiri Bazaar is the town's main market street and the everyday centre of life in Jiri. You'll find small shops, tea houses, and local businesses, and it's where buses and jeeps arrive and depart.\n\nLama Hotel & Lodge is located right in Jiri Bazaar, on the right side of Hotel Paras — convenient if you're arriving by road or heading out early.",
        imageUrl: PLACEHOLDERS.bazaar.url,
        imageAlt: PLACEHOLDERS.bazaar.alt,
        imageCredit: PLACEHOLDERS.bazaar.credit,
      },
      {
        key: "scenery",
        heading: "Hills, forests and mountain views",
        body: "The landscape around Jiri is one of green ridges, pine forest, and terraced fields of millet, maize, and potatoes. On clear days — often in the mornings, and especially after rain or in the cooler months — snow peaks can be seen from the hills around town.\n\nWinters can be cold, and higher ridges sometimes see snow. Bring warm layers if you are visiting between late autumn and early spring.",
        imageUrl: PLACEHOLDERS.himalaya.url,
        imageAlt: PLACEHOLDERS.himalaya.alt,
        imageCredit: PLACEHOLDERS.himalaya.credit,
      },
      {
        key: "practical",
        heading: "Practical tips for visitors",
        body: "- **Weather changes quickly** in the hills. Pack a rain layer and warm clothes.\n- **Carry some cash.** Small shops and local transport often prefer cash.\n- **Check transport locally.** Road conditions and schedules can change, especially during the monsoon.\n- **Ask us.** If you are staying with us, we're happy to share local advice when you arrive.",
      },
    ],
  );

  await upsertPage(
    "jiri-things-to-do",
    {
      title: "Things to Do in Jiri",
      intro:
        "Jiri is a relaxed place to spend a day or two — whether you're starting a trek, resting after one, or just exploring the hills of Dolakha.",
      metaTitle: "Things to Do in Jiri, Nepal",
      metaDescription:
        "Ideas for your time in Jiri, Nepal: explore Jiri Bazaar, walk in the surrounding hills, look out for mountain views and use Jiri as a base for trekking toward the Everest region.",
    },
    [
      {
        key: "explore-bazaar",
        heading: "Explore Jiri Bazaar",
        body: "Take a slow walk along the main bazaar. Stop for tea, watch the morning bustle as buses and jeeps come and go, and get a feel for daily life in a Nepali hill town.",
        imageUrl: PLACEHOLDERS.morning.url,
        imageAlt: PLACEHOLDERS.morning.alt,
        imageCredit: PLACEHOLDERS.morning.credit,
      },
      {
        key: "hill-walks",
        heading: "Walk in the surrounding hills",
        body: "Footpaths lead from the valley up through forest and farmland to the ridges around Jiri. Even a short walk out of town gives you wide views over the valley. Ask locally about paths and conditions before heading out, and give yourself plenty of daylight.",
        imageUrl: PLACEHOLDERS.panorama.url,
        imageAlt: PLACEHOLDERS.panorama.alt,
        imageCredit: PLACEHOLDERS.panorama.credit,
      },
      {
        key: "mountain-views",
        heading: "Look for Himalayan views",
        body: "From viewpoints on the hills near Jiri, snow peaks can appear on the horizon when the sky is clear. Early mornings usually give the best chance of a clear view.",
        imageUrl: PLACEHOLDERS.himalaya.url,
        imageAlt: PLACEHOLDERS.himalaya.alt,
        imageCredit: PLACEHOLDERS.himalaya.credit,
      },
      {
        key: "trekking",
        heading: "Start (or finish) a trek",
        body: "Jiri is the traditional starting point of the classic walk-in route toward Solukhumbu and the Everest region, chosen by trekkers who prefer to walk in rather than fly to Lukla. The route crosses several ridges and valleys before joining the main Everest trail.\n\nTrekking routes, permits, and conditions change over time, so please check current requirements with a registered trekking agency or the relevant authorities before you go. A night's rest in Jiri before an early start is always a good idea.",
      },
      {
        key: "culture",
        heading: "Local life and culture",
        body: "The Jiri area is home to the Jirel people as well as Sherpa, Tamang, and other communities. Be respectful when visiting villages, monasteries, and temples — ask before taking photographs of people, and follow local customs.",
        imageUrl: PLACEHOLDERS.fields.url,
        imageAlt: PLACEHOLDERS.fields.alt,
        imageCredit: PLACEHOLDERS.fields.credit,
      },
    ],
  );

  await upsertPage(
    "jiri-how-to-reach",
    {
      title: "How to Reach Jiri",
      intro:
        "Jiri is reached by road. Here is a general overview — please confirm current schedules, fares, and road conditions before you travel, as these change.",
      metaTitle: "How to Reach Jiri, Nepal — Getting There by Road",
      metaDescription:
        "How to get to Jiri, Nepal by road from Kathmandu: public bus, shared jeep or private vehicle. General guidance and tips — always confirm current schedules locally.",
    },
    [
      {
        key: "by-road",
        heading: "By road from Kathmandu",
        body: "Jiri is connected to Kathmandu by road, heading east from the Kathmandu Valley into Dolakha District. The journey usually takes most of a day, but travel time depends on traffic, road works, and the weather.\n\nThe main options are:\n\n- **Public bus** — the most economical option. Buses to Jiri leave from Kathmandu; ask locally or at your accommodation for the current departure point and times.\n- **Shared jeep** — sometimes faster than the bus, and often available for part or all of the journey.\n- **Private vehicle** — the most flexible and comfortable option, which can be arranged through travel agencies in Kathmandu.",
      },
      {
        key: "important",
        heading: "Before you travel",
        body: "- **Schedules and fares change.** We don't list them here because they change often — please confirm them close to your travel date.\n- **Monsoon season** (roughly June to September) can bring landslides and delays on hill roads. Allow extra time.\n- **Start early.** Arriving in daylight is easier and safer.\n- **Tell us your arrival plans.** Add your expected arrival time in the booking form so we know when to expect you.",
      },
      {
        key: "finding-us",
        heading: "Finding Lama Hotel & Lodge",
        body: "Once you reach Jiri Bazaar, we're easy to find: **right side of Hotel Paras, Jiri Bazaar**. Use the Get Directions button for Google Maps, or call us when you arrive.",
      },
    ],
  );

  // SEO-only pages (meta title / description editable in Admin → SEO).
  const seoPages: [string, string, string, string][] = [
    ["rooms", "Rooms & Prices", "Rooms & Prices", "Standard Rooms (NPR 1,200 per room) and Special Rooms (NPR 1,500 per room) at Lama Hotel & Lodge, Jiri Bazaar. Each room has two 4 × 6 ft beds. Hot & cold shower anytime, free Wi-Fi."],
    ["gallery", "Gallery", "Gallery — Jiri & Lama Hotel & Lodge", "Photos of Jiri, Nepal and its mountains and surroundings. Photos of Lama Hotel & Lodge will be added soon."],
    ["location", "Location", "Location — Lama Hotel & Lodge, Jiri Bazaar", "Find Lama Hotel & Lodge in Jiri Bazaar, Jiri, Nepal — right side of Hotel Paras. Get directions on Google Maps or call +977 9818486480."],
    ["contact", "Contact Us", "Contact Lama Hotel & Lodge, Jiri", "Contact Lama Hotel & Lodge in Jiri Bazaar, Nepal. Call or WhatsApp +977 9818486480 or email sherpanurbu15@gmail.com."],
    ["booking", "Booking Inquiry", "Book a Room in Jiri — Booking Inquiry", "Send a booking inquiry to Lama Hotel & Lodge in Jiri Bazaar, Nepal. We'll contact you to confirm availability. No payment needed online."],
    ["faq", "Frequently Asked Questions", "FAQ — Lama Hotel & Lodge, Jiri", "Answers to common questions about staying at Lama Hotel & Lodge in Jiri Bazaar: prices, rooms, check-in times, Wi-Fi, hot showers and booking."],
  ];
  for (const [slug, title, metaTitle, metaDescription] of seoPages) {
    await upsertPage(slug, { title, metaTitle, metaDescription });
  }
  console.log("✓ Pages (homepage, Jiri guide, SEO pages)");
}

async function seedFaqs() {
  if ((await prisma.fAQ.count()) > 0) return console.log("✓ FAQs (already present)");
  const faqs = [
    [
      "Where is Lama Hotel & Lodge?",
      "We are in Jiri Bazaar, Jiri, Nepal — right side of Hotel Paras. Use the Get Directions button on our Location page to open Google Maps.",
    ],
    [
      "Are your prices per person or per room?",
      "Our prices are per room, not per person. You can see current prices on the Rooms page.",
    ],
    [
      "How many beds are in each room?",
      "Each room has two 4 × 6 ft beds. Tell us how many people are travelling when you send your inquiry, and we'll confirm the best arrangement for your group.",
    ],
    ["How many rooms do you have?", "We have 8 rooms: 6 Standard Rooms and 2 Special Rooms."],
    ["Is there hot water?", "Yes — hot and cold showers are available anytime."],
    ["Do you have Wi-Fi?", "Yes, Wi-Fi is free for guests."],
    ["What are the check-in and check-out times?", "Check-in is from {{checkInTime}} and check-out is by {{checkOutTime}}."],
    [
      "Is my room confirmed when I send the booking form?",
      "No. The booking form sends us an inquiry. We will contact you to confirm availability — your booking is confirmed only after we confirm it with you.",
    ],
    ["Do I need to pay online?", "No. There is no online payment. Payment is arranged directly with the hotel."],
    [
      "How can I contact you quickly?",
      "Call or WhatsApp us on {{phone}}, or email {{email}}.",
    ],
  ];
  await prisma.fAQ.createMany({
    data: faqs.map(([question, answer], i) => ({ question, answer, sortOrder: i + 1 })),
  });
  console.log("✓ FAQs");
}

async function main() {
  await seedAdmin();
  await seedSettings();
  await seedRooms();
  await seedFacilities();
  await seedGallery();
  await seedPages();
  await seedFaqs();
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
