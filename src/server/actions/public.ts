"use server";

import { prisma } from "@/lib/db";
import { after } from "next/server";
import { notifyOwner } from "@/lib/notify";
import { createBookingInquiry } from "@/server/services/inquiries";
import { currentIp, currentIpHash, isSameOrigin } from "@/lib/security";
import { verifyTurnstile } from "@/lib/turnstile";
import { bookingSchema, contactSchema, fieldErrors, type FieldErrors } from "@/lib/validation/schemas";
import { formatDate, formatPhoneIntl, todayInNepal } from "@/lib/utils/format";
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
const MAX_MESSAGES_PER_HOUR = 5;
const GENERIC_ERROR = "Sorry, something went wrong. Please try again, or call / WhatsApp us directly.";
const BOT_CHECK_FAILED = "We couldn't confirm you're not a robot. Please complete the security check above the button and try again.";

/** Cloudflare Turnstile token added to the form by <Turnstile />. */
const humanCheck = async (fd: FormData) => verifyTurnstile(String(fd.get("cf-turnstile-response") ?? ""), await currentIp());

/** Message the guest sends to the hotel from the success screen ("WhatsApp us"). */
function bookingWhatsappText(d: { name: string; phone: string; checkIn: Date; checkOut: Date; roomType: string; numberOfRooms: number; guests: number; message?: string }) {
  const lines = [
    "Hello Hotel Pine Valley, I just sent a booking inquiry on your website.",
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

    const result = await createBookingInquiry(data, await currentIpHash());
    if (result.status === "no_room") return { status: "error", message: "Please choose a room type.", errors: { roomSlug: ["Please choose a room type"] }, values };
    if (result.status === "rate_limited") {
      return { status: "error", message: "You've sent several inquiries recently. Please wait a while, or call / WhatsApp us directly.", values };
    }
    const whatsappText = bookingWhatsappText({ ...data, checkIn: new Date(`${data.checkIn}T00:00:00Z`), checkOut: new Date(`${data.checkOut}T00:00:00Z`), roomType: result.roomName });
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
