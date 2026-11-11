"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { generateWithFallback, isAiEnabled } from "@/lib/ai/client";
import { getCategoryAvailability, MAX_RANGE_NIGHTS, nightsBetween, toDateStr } from "@/lib/availability";
import { getFacilities, getFaqsResolved, getHotel, getRooms } from "@/lib/data/public";
import { formatPrice, formatTime } from "@/lib/utils/format";
import { idSchema } from "./helpers";
import { languageRule } from "@/lib/ai/language";

export type DraftResult = { ok: true; draft: string } | { ok: false; message: string };

const INSTRUCTIONS = `You draft email/WhatsApp replies for the owner of Hotel Pine Valley, a small lodge in Jiri, Nepal.
Rules:
- Write a polite, warm, concise reply to the guest, signed "Hotel Pine Valley".
- Reply in the SAME language and script the guest used: Devanagari Nepali → Devanagari Nepali; Romanized Nepali / Nepali-English mix (e.g. "room khali xa?") → the same casual Romanized Nepali with "hajur"; otherwise English.
- Use ONLY the facts in the HOTEL DATA and GUEST REQUEST sections. Never invent prices, discounts, policies, availability, transport or services.
- Availability shown is a live snapshot, not a confirmed booking. Never say a booking is confirmed; say the owner will confirm.
- If something is unknown or not in the data, say the owner will confirm, or ask the guest a short question.
- Plain text only, no markdown, no placeholders like [Name]. The owner will review and send it themselves.`;

async function hotelData() {
  const [hotel, rooms, facilities, faqs] = await Promise.all([getHotel(), getRooms(), getFacilities(), getFaqsResolved()]);
  return [
    `Hotel: ${hotel.name}, ${hotel.address} (${hotel.locationDescription}). Phone ${hotel.phone}, WhatsApp ${hotel.whatsapp}, email ${hotel.email}.`,
    `Check-in ${formatTime(hotel.checkInTime)}, check-out ${formatTime(hotel.checkOutTime)}.`,
    `Rooms (price is per room${rooms[0]?.priceSuffix ? `, ${rooms[0].priceSuffix}` : ""}):`,
    ...rooms
      .filter((r) => r.status === "AVAILABLE")
      .map((r) => `- ${r.name}: ${formatPrice(r.price, r.currency)}; beds: ${r.bedDescription}; capacity: ${r.capacityDescription}. ${r.shortDescription}`),
    `Facilities: ${facilities.map((f) => f.name).join(", ") || "none listed"}.`,
    `FAQ / policies:`,
    ...faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`),
  ].join("\n");
}

// Reply language decided in code from the guest's message (models drift between English / Nepali / Romanized otherwise).
const nepaliHint = (text: string) => `\n\n${languageRule(text)}`;

async function draft(prompt: string): Promise<DraftResult> {
  const r = await generateWithFallback({ instructions: INSTRUCTIONS, prompt });
  return r.ok ? { ok: true, draft: r.text } : { ok: false, message: "The AI assistant is busy right now. Please try again in a minute, or write the reply yourself." };
}

const disabled: DraftResult = { ok: false, message: "AI drafting is not configured." };
const notFound: DraftResult = { ok: false, message: "This item no longer exists. Please refresh the page." };

export async function draftInquiryReply(id: string): Promise<DraftResult> {
  await requireAdmin();
  if (!isAiEnabled()) return disabled;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return notFound;
  const b = await prisma.bookingInquiry.findUnique({ where: { id: parsed.data } });
  if (!b) return notFound;

  const from = toDateStr(b.checkIn);
  const to = toDateStr(b.checkOut);
  const nights = nightsBetween(from, to);
  let availability = "Not checked (dates are in the past or the stay is too long) — the owner will confirm.";
  if (from >= toDateStr(new Date()) && nights > 0 && nights <= MAX_RANGE_NIGHTS) {
    const rows = await getCategoryAvailability(from, to);
    availability = rows.map((r) => `- ${r.name}: ${r.available} of ${r.total} rooms free for all nights`).join("\n");
  }

  return draft(
    [
      "HOTEL DATA",
      await hotelData(),
      "",
      `LIVE AVAILABILITY for ${from} → ${to}:`,
      availability,
      "",
      "GUEST REQUEST (booking inquiry)",
      `Name: ${b.name}`,
      `Country: ${b.country || "—"}`,
      `Dates: check-in ${from}, check-out ${to} (${nights} night${nights === 1 ? "" : "s"})`,
      `Room type requested: ${b.roomType || "any"}; rooms: ${b.numberOfRooms}; guests: ${b.guests}`,
      `Arrival info: ${b.arrivalInfo || "—"}`,
      `Message: ${b.message || "—"}`,
      nepaliHint(b.message),
    ].join("\n"),
  );
}

export async function draftMessageReply(id: string): Promise<DraftResult> {
  await requireAdmin();
  if (!isAiEnabled()) return disabled;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return notFound;
  const m = await prisma.contactMessage.findUnique({ where: { id: parsed.data }, select: { name: true, message: true } });
  if (!m) return notFound;

  return draft(["HOTEL DATA", await hotelData(), "", "GUEST REQUEST (contact form message)", `Name: ${m.name}`, `Message: ${m.message}`, nepaliHint(m.message)].join("\n"));
}
