/**
 * Instant answers for the most common simple English messages — no model call, so the reply is immediate.
 * Anything not matched here (dates, Nepali, longer questions) goes to the model as before. Pure, so it is unit-tested.
 */
export type QuickRoom = { name: string; link: string; price: string; totalRooms: number };
export type QuickData = { rooms: QuickRoom[]; phone: string; whatsapp: string };

export const OFF_TOPIC_REPLY =
  "I can only assist with information about our lodge, its rooms, booking, and details about Jiri. Would you like to know more about our facilities or how to reach us?";

const roomLines = (rooms: QuickRoom[], withCount: boolean) =>
  rooms.map((r) => `- [${r.name}](${r.link}) — ${withCount ? `${r.totalRooms} room${r.totalRooms === 1 ? "" : "s"}, ` : ""}${r.price}`).join("\n");

export function quickReply(message: string, d: QuickData): string | null {
  const t = message.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!t || /\d/.test(t)) return null; // dates/numbers need the model (availability, totals)
  const contact = `You can also call ${d.phone} or WhatsApp ${d.whatsapp}.`;

  if (/^(hi+|hello+|hey+|hiya|namaste|good (morning|afternoon|evening))( there| all)?$/.test(t))
    return "Hello! 👋 Welcome to Hotel Pine Valley. I can help with our rooms, rates, booking or how to reach Jiri — what would you like to know?";
  if (/^(ok )?(thanks|thank you|thank u|thx|ty)( so much| very much| a lot)?$/.test(t))
    return "You're welcome! Let me know if you need anything else about the lodge or Jiri. 🙂";
  if (!d.rooms.length) return null;

  // Live availability ("free", "available", "tonight") needs the checkAvailability tool.
  if (/\b(free|available|availability|vacant|left|tonight|tomorrow|weekend)\b/.test(t)) return null;
  if (/\bhow many (rooms?|room types?)\b/.test(t)) {
    const total = d.rooms.reduce((n, r) => n + r.totalRooms, 0);
    return `We have ${total} rooms in ${d.rooms.length} type${d.rooms.length === 1 ? "" : "s"}:\n${roomLines(d.rooms, true)}\nWant me to check availability for your dates?`;
  }
  if (/\b(rates?|prices?|pricing|cost|costs|tariffs?|charges?|how much)\b/.test(t) && /\b(rooms?|rates?|tariffs?|stay|night|per night|lodge|hotel)\b/.test(t))
    return `Our room rates (per room, per night):\n${roomLines(d.rooms, false)}\nThe owner confirms the final price. Tell me your dates and I can check availability.`;
  if (/\b(how|where)\b.*\b(book|booking|inquire|enquire|inquiry|enquiry|reserve|reservation|request)\b/.test(t))
    return `Just tell me your check-in and check-out dates, room type and number of guests, and I'll prepare the request for you — or use the [booking form](/booking). ${contact}`;
  return null;
}
