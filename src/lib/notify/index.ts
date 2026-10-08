import "server-only";
import { prisma } from "@/lib/db";
import { emailProvider, renderEmail, sendEmail, type DeliveryResult } from "./email";
import { BOOKING_SUCCESS_MESSAGE } from "@/config/messages";
import { formatPhoneIntl } from "@/lib/utils/format";

export { emailProvider };

/** Far above a small lodge's real daily inquiries; owner alerts are never capped. */
const MAX_GUEST_EMAILS_PER_DAY = 40;

/** Mask a recipient for the delivery log (owner's own contact details, but no need to show them in full). */
function mask(recipient: string) {
  return recipient.replace(/(.{3}).+(.{3})$/, "$1•••$2");
}

async function log(channel: "EMAIL", event: string, recipient: string, result: DeliveryResult) {
  try {
    await prisma.notificationLog.create({ data: { channel, event, recipient: mask(recipient), success: result.success, detail: result.detail.slice(0, 500) } });
  } catch (err) {
    console.error("Notification log failed", err);
  }
}

async function recipients() {
  const h = await prisma.hotelSettings.findUnique({
    where: { id: "default" },
    select: { email: true, notificationEmail: true, notifyEmail: true },
  });
  return {
    email: h?.notificationEmail || h?.email || "",
    notifyEmail: h?.notifyEmail ?? true,
  };
}

/**
 * Notify the owner about a new website submission. Call this AFTER the record is saved
 * (ideally inside `after()`), so a failed email can never lose a booking.
 * Never throws.
 */
export async function notifyOwner(opts: {
  event: "booking_inquiry" | "contact_message";
  subject: string;
  rows: [string, string][];
  replyTo?: string;
}) {
  try {
    const to = await recipients();
    const jobs: Promise<unknown>[] = [];
    if (to.notifyEmail && emailProvider().name && to.email) {
      const { html, text } = renderEmail(opts.subject, opts.rows, "Open the admin dashboard to reply and update the status.");
      jobs.push(sendEmail({ to: to.email, subject: opts.subject, html, text, replyTo: opts.replyTo }).then((r) => log("EMAIL", opts.event, to.email, r)));
    }
    await Promise.allSettled(jobs);
  } catch (err) {
    console.error("Owner notification failed", err);
  }
}

/**
 * Thank-you email to the guest after a booking inquiry. It must say the room is NOT confirmed yet.
 * Replies go to the hotel. Call AFTER the record is saved (inside `after()`). Never throws.
 */
export async function notifyGuest(opts: { to: string; name: string; rows: [string, string][] }) {
  try {
    if (!emailProvider().name || !opts.to) return;
    // Guests type their own address, so cap these per day: a bot can't turn the hotel's Gmail into a
    // spam sender (and use up its sending limit, which would also stop the owner's booking alerts).
    const sentToday = await prisma.notificationLog.count({
      where: { event: "booking_guest_confirmation", createdAt: { gte: new Date(Date.now() - 86_400_000) } },
    });
    if (sentToday >= MAX_GUEST_EMAILS_PER_DAY) {
      console.warn(`Guest confirmation skipped: daily cap of ${MAX_GUEST_EMAILS_PER_DAY} reached`);
      return;
    }
    const h = await prisma.hotelSettings.findUnique({
      where: { id: "default" },
      select: { name: true, phone: true, whatsapp: true, email: true, notificationEmail: true },
    });
    const hotelName = h?.name || "Lama Hotel & Lodge";
    const subject = `We received your booking inquiry — ${hotelName}`;
    const intro = `Dear ${opts.name},\n\n${BOOKING_SUCCESS_MESSAGE}\n\nPlease note: your room is not confirmed until we contact you. No payment is needed now.`;
    const contact = [h?.phone && `Phone ${formatPhoneIntl(h.phone)}`, h?.whatsapp && `WhatsApp ${formatPhoneIntl(h.whatsapp)}`].filter(Boolean).join(" · ");
    const footer = `You can reply to this email${contact ? ` or contact us (${contact})` : ""}. — ${hotelName}`;
    const { html, text } = renderEmail("Thank you — inquiry received", opts.rows, footer, intro);
    const r = await sendEmail({ to: opts.to, subject, html, text, replyTo: h?.notificationEmail || h?.email || undefined });
    await log("EMAIL", "booking_guest_confirmation", opts.to, r);
  } catch (err) {
    console.error("Guest confirmation email failed", err);
  }
}

/** Test messages from Admin → Settings (logged like real ones). */
export async function sendTestEmail(to: string) {
  const { html, text } = renderEmail("Test notification — Lama Hotel & Lodge", [["Status", "Email notifications are working."]], "You can change these settings in Admin → Settings.");
  const r = await sendEmail({ to, subject: "Test notification — Lama Hotel & Lodge", html, text });
  await log("EMAIL", "test", to, r);
  return r;
}
