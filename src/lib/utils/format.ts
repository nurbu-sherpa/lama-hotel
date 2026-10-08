/** Formatting helpers shared by server and client components. */

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** "NPR 1,200" — price is always per room; never multiplied by guests. */
export function formatPrice(amount: number, currency = "NPR") {
  return `${currency} ${new Intl.NumberFormat("en-US").format(amount)}`;
}

/** "14:00" → "2:00 PM" */
export function formatTime(hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm;
  const h = Number(m[1]);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${period}`;
}

/** Digits only, with Nepal country code (977) added to local 10-digit mobile numbers. */
export function phoneDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return digits;
  if (digits.length === 10) return `977${digits}`;
  return digits;
}

/** "9818486480" → "+977 9818486480" */
export function formatPhoneIntl(phone: string) {
  const d = phoneDigits(phone);
  if (d.startsWith("977") && d.length === 13) return `+977 ${d.slice(3)}`;
  return phone.trim().startsWith("+") ? phone.trim() : `+${d}`;
}

export function telHref(phone: string) {
  return `tel:+${phoneDigits(phone)}`;
}

const DEFAULT_WHATSAPP_MESSAGE = `Hello Lama Hotel & Lodge,

I would like to inquire about accommodation.

Check-in:
Check-out:
Guests:
Room type:`;

export function whatsappHref(whatsapp: string, message: string = DEFAULT_WHATSAPP_MESSAGE) {
  const base = `https://wa.me/${phoneDigits(whatsapp)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function mailtoHref(email: string, subject?: string) {
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}

/** Date-only formatting (stored as UTC midnight). */
export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
  }).format(date);
}

export function nightsBetween(checkIn: Date, checkOut: Date) {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
}

/** Today's date (YYYY-MM-DD) in Nepal time. */
export function todayInNepal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date());
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Replace {{tokens}} in admin-written text (e.g. FAQ answers) with live hotel settings. */
export function fillTokens(text: string, values: Record<string, string>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => values[key] ?? match);
}
