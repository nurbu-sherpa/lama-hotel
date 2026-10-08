"use server";

import { prisma } from "@/lib/db";
import { after } from "next/server";
import { notifyGuest, notifyOwner } from "@/lib/notify";
import { currentIp, currentIpHash, isSameOrigin } from "@/lib/security";
import { verifyTurnstile } from "@/lib/turnstile";
import { bookingSchema, contactSchema, fieldErrors, type FieldErrors } from "@/lib/validation/schemas";
import { formatDate, formatPhoneIntl, formatPrice, todayInNepal } from "@/lib/utils/format";
import { BOOKING_SUCCESS_MESSAGE } from "@/config/messages";
import { getPublicAvailability } from "@/lib/data/availability";

export type PublicFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: FieldErrors;
  /** Echo submitted values so the form keeps them after a failed submit. */
  values?: Record<string, string>;
  /** Booking only: pre-filled WhatsApp text with the guest's inquiry details. */
  whatsappText?: string;
};

const HOUR = 60 * 60 * 1000;
const MAX_BOOKINGS_PER_HOUR = 5;
const MAX_MESSAGES_PER_HOUR = 5;
const GENERIC_ERROR = "Sorry, something went wrong. Please try again, or call / WhatsApp us directly.";
const BOT_CHECK_FAILED = "We couldn't confirm you're not a robot. Please complete the security check above the button and try again.";

/** Cloudflare Turnstile token added to the form by <Turnstile />. */
const humanCheck = async (fd: FormData) => verifyTurnstile(String(fd.get("cf-turnstile-response") ?? ""), await currentIp());

/** Message the guest sends to the hotel from the success screen ("WhatsApp us"). */
function bookingWhatsappText(d: { name: string; phone: string; checkIn: Date; checkOut: Date; roomType: string; numberOfRooms: number; guests: number; message?: string }) {
  const lines = [
    "Hello Lama Hotel & Lodge, I just sent a booking inquiry on your website.",
    "",
    `Name: ${d.name}`,
    `Phone: ${d.phone}`,
    `Check-in: ${formatDate(d.checkIn)}`,
    `Check-out: ${formatDate(d.checkOut)}`,
    `Room type: ${d.roomType} (${d.numberOfRooms} room${d.numberOfRooms === 1 ? "" : "s"}, ${d.guests} guest${d.guests === 1 ? "" : "s"})`,
  ];
  // Keep the wa.me URL a sensible length.
  if (d.message) lines.push(`Message: ${d.message.length > 500 ? `${d.message.slice(0, 500)}…` : d.message}`);
  return lines.join("\n");
}

function formValues(fd: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "").slice(0, 5000)]));
}

export async function submitBookingInquiry(_prev: PublicFormState, formData: FormData): Promise<PublicFormState> {
  const keys = ["name", "email", "phone", "country", "checkIn", "checkOut", "guests", "roomSlug", "numberOfRooms", "message", "arrivalInfo", "website"];
  const values = formValues(formData, keys);

  try {
    if (!(await isSameOrigin())) return { status: "error", message: GENERIC_ERROR, values };

    const parsed = bookingSchema(todayInNepal()).safeParse(values);
    if (!parsed.success) {
      // Honeypot filled → silently pretend success (don't tip off bots).
      if (values.website) return { status: "success", message: BOOKING_SUCCESS_MESSAGE };
      return { status: "error", message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error), values };
    }
    const data = parsed.data;
    if (!(await humanCheck(formData))) return { status: "error", message: BOT_CHECK_FAILED, values };

    const room = await prisma.room.findUnique({
      where: { slug: data.roomSlug },
      select: { id: true, name: true, price: true, currency: true, priceSuffix: true },
    });
    if (!room) return { status: "error", message: "Please choose a room type.", errors: { roomSlug: ["Please choose a room type"] }, values };

    const ipHash = await currentIpHash();
    const recent = await prisma.bookingInquiry.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - HOUR) } } });
    if (recent >= MAX_BOOKINGS_PER_HOUR) {
      return { status: "error", message: "You've sent several inquiries recently. Please wait a while, or call / WhatsApp us directly.", values };
    }

    const checkIn = new Date(`${data.checkIn}T00:00:00Z`);
    const checkOut = new Date(`${data.checkOut}T00:00:00Z`);
    const whatsappText = bookingWhatsappText({ ...data, checkIn, checkOut, roomType: room.name });

    // Duplicate submission (double click / resubmit) → don't create a second record.
    const duplicate = await prisma.bookingInquiry.findFirst({
      where: { email: data.email, checkIn, checkOut, roomId: room.id, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
      select: { id: true },
    });
    if (duplicate) return { status: "success", message: BOOKING_SUCCESS_MESSAGE, whatsappText };

    // 1) Save first — an inquiry must never be lost because email failed.
    const inquiry = await prisma.bookingInquiry.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        country: data.country,
        checkIn,
        checkOut,
        guests: data.guests, // informational only
        roomId: room.id,
        roomType: room.name,
        numberOfRooms: data.numberOfRooms,
        message: data.message,
        arrivalInfo: data.arrivalInfo,
        requestedRoomPrice: room.price, // snapshot of advertised price — NOT a confirmed price
        currency: room.currency,
        ipHash,
      },
    });

    // 2) Then notify the owner by email AFTER the response is sent (best effort, never throws,
    //    never delays or breaks the guest's submission).
    after(() =>
      notifyOwner({
        event: "booking_inquiry",
        replyTo: data.email,
        subject: `New booking inquiry — ${room.name}, ${formatDate(checkIn)}`,
      rows: [
        ["Name", data.name],
        ["Email", data.email],
        ["Phone", data.phone],
        ["Country", data.country],
        ["Check-in", formatDate(checkIn)],
        ["Check-out", formatDate(checkOut)],
        ["Room type", `${room.name} (${formatPrice(room.price, room.currency)} ${room.priceSuffix})`],
        ["Number of rooms", String(data.numberOfRooms)],
        ["Guests", String(data.guests)],
        ["Arrival info", data.arrivalInfo],
        ["Message", data.message],
        ["Reference", inquiry.id],
      ],
      }),
    );

    // 3) Thank-you email to the guest (also best effort, after the response).
    after(() =>
      notifyGuest({
        to: data.email,
        name: data.name,
        rows: [
          ["Name", data.name],
          ["Phone", data.phone],
          ["Check-in", formatDate(checkIn)],
          ["Check-out", formatDate(checkOut)],
          ["Room type", room.name],
          ["Number of rooms", String(data.numberOfRooms)],
          ["Guests", String(data.guests)],
          ["Arrival info", data.arrivalInfo],
          ["Message", data.message],
          ["Reference", inquiry.id],
        ],
      }),
    );

    return { status: "success", message: BOOKING_SUCCESS_MESSAGE, whatsappText };
  } catch (err) {
    console.error("Booking inquiry failed", err);
    return { status: "error", message: GENERIC_ERROR, values };
  }
}

export async function submitContactMessage(_prev: PublicFormState, formData: FormData): Promise<PublicFormState> {
  const values = formValues(formData, ["name", "email", "phone", "message", "website"]);
  try {
    if (!(await isSameOrigin())) return { status: "error", message: GENERIC_ERROR, values };

    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      if (values.website) return { status: "success", message: "Thank you — your message has been sent." };
      return { status: "error", message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error), values };
    }
    const data = parsed.data;
    if (!(await humanCheck(formData))) return { status: "error", message: BOT_CHECK_FAILED, values };

    const ipHash = await currentIpHash();
    const recent = await prisma.contactMessage.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - HOUR) } } });
    if (recent >= MAX_MESSAGES_PER_HOUR) {
      return { status: "error", message: "You've sent several messages recently. Please wait a while, or call / WhatsApp us directly.", values };
    }

    const duplicate = await prisma.contactMessage.findFirst({
      where: { email: data.email, message: data.message, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
      select: { id: true },
    });
    if (!duplicate) {
      await prisma.contactMessage.create({ data: { name: data.name, email: data.email, phone: data.phone, message: data.message, ipHash } });
      after(() =>
        notifyOwner({
          event: "contact_message",
          replyTo: data.email,
          subject: `New message from ${data.name}`,
          rows: [
            ["Name", data.name],
            ["Email", data.email],
            ["Phone", data.phone ? formatPhoneIntl(data.phone) : ""],
            ["Message", data.message],
          ],
        }),
      );
    }
    return { status: "success", message: "Thank you — your message has been sent. We'll get back to you soon." };
  } catch (err) {
    console.error("Contact message failed", err);
    return { status: "error", message: GENERIC_ERROR, values };
  }
}

/**
 * Public, aggregated availability for the booking form (counts per room type only).
 * Returns null when the owner hasn't enabled public availability. Never returns guest data.
 */
export async function checkPublicAvailability(checkIn: string, checkOut: string) {
  try {
    const rows = await getPublicAvailability(String(checkIn).slice(0, 10), String(checkOut).slice(0, 10));
    return rows?.map((r) => ({ slug: r.slug, available: r.available, status: r.status })) ?? null;
  } catch {
    return null;
  }
}
