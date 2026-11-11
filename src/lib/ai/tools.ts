import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { getFacilities, getFaqsResolved, getHotel, getPage, getRoom, getRooms } from "@/lib/data/public";
import { getPublicAvailability } from "@/lib/data/availability";
import { bookingSchema, stayDatesSchema } from "@/lib/validation/schemas";
import { formatDate, formatPrice, formatTime, todayInNepal } from "@/lib/utils/format";
import { nightsBetween } from "@/lib/availability/core";
import type { InquiryDraft } from "./chat-shared";
import { signDraft } from "./inquiry-draft";
import { restoreContacts } from "./redact";

/**
 * Tools for the public chat assistant. They only read PUBLIC content (the same data the website shows)
 * and can only PREPARE a booking request: the guest must press "Yes, send to the owner" on the card it produces
 * (handled by /api/chat/confirm). Nothing here can read admin data, other guests' data or reservations, or
 * create/confirm a reservation — and nothing here writes to the database at all.
 */

const GUIDES = { jiri: "jiri", "how-to-reach": "jiri-how-to-reach", "things-to-do": "jiri-things-to-do" } as const;
const clip = (s: string, n = 1500) => (s.length > n ? `${s.slice(0, n)}…` : s);
const issues = (e: z.ZodError) => e.issues.map((i) => i.message);

export async function roomsInfo() {
  const rooms = await getRooms();
  return rooms
    .filter((r) => r.status === "AVAILABLE")
    .map((r) => ({
      name: r.name,
      slug: r.slug,
      link: `/rooms/${r.slug}`,
      price: `${formatPrice(r.price, r.currency)} ${r.priceSuffix}`.trim(),
      totalRooms: r.totalRooms,
      beds: r.bedDescription,
      capacity: r.capacityDescription,
      summary: r.shortDescription,
    }));
}

export async function hotelInfo(topic: "rooms" | "facilities" | "faq" | "contact" | keyof typeof GUIDES) {
  if (topic === "rooms") return { rooms: await roomsInfo(), note: "Prices are per room. The owner confirms the final price." };
  if (topic === "facilities") return { facilities: (await getFacilities()).map((f) => ({ name: f.name, description: f.description })) };
  if (topic === "faq") return { faqs: (await getFaqsResolved()).map((f) => ({ question: f.question, answer: clip(f.answer, 800) })), link: "/faq" };
  if (topic === "contact") {
    const h = await getHotel();
    return {
      name: h.name,
      address: h.address,
      phone: h.phone,
      whatsapp: h.whatsapp,
      email: h.email,
      checkIn: formatTime(h.checkInTime),
      checkOut: formatTime(h.checkOutTime),
      map: h.googleMapsUrl,
      links: { contact: "/contact", location: "/location", booking: "/booking" },
    };
  }
  const page = await getPage(GUIDES[topic]);
  if (!page) return { error: "No guide content yet." };
  return {
    title: page.title,
    link: topic === "jiri" ? "/jiri" : `/jiri/${topic}`,
    intro: page.intro,
    sections: page.sections.map((s) => ({ heading: s.heading, text: clip(s.body) })),
  };
}

export function chatTools(ctx: { contacts: Map<string, string>; onDraft: (draft: InquiryDraft) => void }) {
  return {
    searchHotelInfo: tool({
      description:
        "Look up facts about Hotel Pine Valley and Jiri: rooms (prices, beds, capacity), facilities, FAQ/policies, contact details & check-in times, and the Jiri guides (about Jiri, how to reach Jiri, things to do).",
      inputSchema: z.object({ topic: z.enum(["rooms", "facilities", "faq", "contact", "jiri", "how-to-reach", "things-to-do"]) }),
      execute: async ({ topic }) => hotelInfo(topic),
    }),

    checkAvailability: tool({
      description: "Check how many rooms of each type are free for a stay. Dates are YYYY-MM-DD; checkOut is the departure day.",
      inputSchema: z.object({ checkIn: z.string().describe("YYYY-MM-DD"), checkOut: z.string().describe("YYYY-MM-DD") }),
      execute: async (input) => {
        const parsed = stayDatesSchema(todayInNepal()).safeParse(input);
        if (!parsed.success) return { ok: false, errors: issues(parsed.error) };
        const [rows, rooms] = await Promise.all([getPublicAvailability(parsed.data.checkIn, parsed.data.checkOut), getRooms()]);
        if (!rows) {
          return { ok: true, published: false, note: "Live availability is not published. The guest can send a booking request (/booking) and the owner will confirm availability." };
        }
        return {
          ok: true,
          published: true,
          note: "Snapshot only — not a reservation. The owner confirms every booking.",
          rooms: rows.map((r) => ({ room: rooms.find((x) => x.slug === r.slug)?.name ?? r.slug, slug: r.slug, freeRooms: r.available, status: r.status })),
        };
      },
    }),

    createInquiry: tool({
      description:
        "Prepare the guest's booking request once you have all details. It does NOT send anything: it shows the guest a card with the details and a 'Yes, send to the owner' button. Call it again with corrected details if they want changes. email/phone may be placeholders like [email-1].",
      inputSchema: z.object({
        name: z.string(),
        email: z.string(),
        phone: z.string(),
        country: z.string(),
        checkIn: z.string().describe("YYYY-MM-DD"),
        checkOut: z.string().describe("YYYY-MM-DD"),
        roomSlug: z.string().describe("slug from searchHotelInfo rooms"),
        numberOfRooms: z.number().int(),
        guests: z.number().int(),
        message: z.string().optional(),
        arrivalInfo: z.string().optional(),
      }),
      execute: async (input) => {
        const parsed = bookingSchema(todayInNepal()).safeParse({
          ...input,
          email: restoreContacts(input.email, ctx.contacts),
          phone: restoreContacts(input.phone, ctx.contacts),
          message: input.message ?? "",
          arrivalInfo: input.arrivalInfo ?? "",
        });
        if (!parsed.success) return { ok: false, errors: issues(parsed.error) };
        const d = parsed.data;
        const room = await getRoom(d.roomSlug);
        if (!room || room.status !== "AVAILABLE") return { ok: false, errors: ["Unknown room — use a slug from the LODGE DATA rooms."] };
        const nights = nightsBetween(d.checkIn, d.checkOut);
        ctx.onDraft({
          token: signDraft(d),
          summary: [
            ["Name", d.name],
            ["Email", d.email],
            ["Phone", d.phone],
            ["Country", d.country],
            ["Dates", `${formatDate(new Date(`${d.checkIn}T00:00:00Z`))} → ${formatDate(new Date(`${d.checkOut}T00:00:00Z`))} (${nights} night${nights === 1 ? "" : "s"})`],
            ["Room", `${room.name} × ${d.numberOfRooms}`],
            ["Guests", String(d.guests)],
            ...(d.arrivalInfo ? [["Arrival", d.arrivalInfo] as [string, string]] : []),
            ...(d.message ? [["Message", d.message] as [string, string]] : []),
          ],
        });
        return {
          ok: true,
          note: "A confirmation card with these details is now shown to the guest. NOTHING has been sent yet. Ask the guest to check it and press 'Yes, send to the owner', or tell you what to change.",
        };
      },
    }),
  };
}
