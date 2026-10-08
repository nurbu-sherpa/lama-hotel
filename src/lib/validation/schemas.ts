import { z } from "zod";

/** Strip control characters (keep newlines/tabs) and trim. */
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

const text = (max: number) => z.string().transform(clean).pipe(z.string().max(max, `Must be ${max} characters or fewer`));
const required = (label: string, max: number) =>
  z
    .string({ error: `${label} is required` })
    .transform(clean)
    .pipe(z.string().min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`));

const email = z
  .string({ error: "Email is required" })
  .transform((s) => clean(s).toLowerCase())
  .pipe(z.email("Please enter a valid email address").max(254));

const phone = z
  .string({ error: "Phone is required" })
  .transform(clean)
  .pipe(
    z
      .string()
      .min(1, "Phone is required")
      .max(25, "Phone number is too long")
      .regex(/^\+?[0-9\s\-().]+$/, "Please enter a valid phone number")
      .refine((v) => {
        const digits = v.replace(/\D/g, "").length;
        return digits >= 7 && digits <= 15;
      }, "Please enter a valid phone number"),
  );

const optionalPhone = z
  .string()
  .transform(clean)
  .pipe(
    z
      .string()
      .max(25, "Phone number is too long")
      .refine((v) => v === "" || (/^\+?[0-9\s\-().]+$/.test(v) && v.replace(/\D/g, "").length >= 7 && v.replace(/\D/g, "").length <= 15), "Please enter a valid phone number"),
  );

const isoDate = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `Please choose a valid ${label.toLowerCase()} date`)
    .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), `Please choose a valid ${label.toLowerCase()} date`);

const intInRange = (label: string, min: number, max: number) =>
  z.coerce
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be ${max} or fewer`);

// ─────────────────────────────────────────────
// Public forms
// ─────────────────────────────────────────────

const MAX_STAY_NIGHTS = 60;

export function bookingSchema(today: string) {
  return z
    .object({
      name: required("Name", 100),
      email,
      phone,
      country: required("Country", 80),
      checkIn: isoDate("Check-in"),
      checkOut: isoDate("Check-out"),
      // Informational only — never used for price.
      guests: intInRange("Number of guests", 1, 50),
      roomSlug: required("Room type", 80),
      numberOfRooms: intInRange("Number of rooms", 1, 8),
      message: text(2000),
      arrivalInfo: text(500),
      website: z.string().max(0).optional(), // honeypot
    })
    .superRefine((v, ctx) => {
      if (v.checkIn < today) {
        ctx.addIssue({ code: "custom", path: ["checkIn"], message: "Check-in date cannot be in the past" });
      }
      if (v.checkOut <= v.checkIn) {
        ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Check-out must be after check-in" });
      } else {
        const nights = (Date.parse(v.checkOut) - Date.parse(v.checkIn)) / 86_400_000;
        if (nights > MAX_STAY_NIGHTS) {
          ctx.addIssue({ code: "custom", path: ["checkOut"], message: `For stays longer than ${MAX_STAY_NIGHTS} nights, please contact us directly` });
        }
      }
      const maxDate = new Date(Date.parse(`${today}T00:00:00Z`) + 2 * 365 * 86_400_000).toISOString().slice(0, 10);
      if (v.checkIn > maxDate) {
        ctx.addIssue({ code: "custom", path: ["checkIn"], message: "Please choose a date within the next two years" });
      }
    });
}

export const contactSchema = z.object({
  name: required("Name", 100),
  email,
  phone: optionalPhone,
  message: required("Message", 3000).pipe(z.string().min(5, "Message is too short")),
  website: z.string().max(0).optional(), // honeypot
});

export const loginSchema = z.object({
  email: z.string().transform((s) => s.trim().toLowerCase()).pipe(z.email().max(254)),
  password: z.string().min(1).max(200),
});

// ─────────────────────────────────────────────
// Admin forms
// ─────────────────────────────────────────────

const optionalUrl = z
  .string()
  .transform(clean)
  .pipe(
    z
      .string()
      .max(500)
      .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "Must be a full https:// link (or leave empty)"),
  );

const time24 = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Please choose a valid time");

export const hotelSettingsSchema = z.object({
  name: required("Hotel name", 120),
  tagline: required("Tagline", 160),
  description: required("Description", 2000),
  phone,
  whatsapp: phone,
  email,
  address: required("Address", 200),
  locationDescription: text(200),
  city: required("City", 80),
  region: text(80),
  country: required("Country", 80),
  checkInTime: time24,
  checkOutTime: time24,
  googleBusinessUrl: optionalUrl,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  youtubeUrl: optionalUrl,
});

export const mapsSettingsSchema = z.object({
  googleMapsUrl: optionalUrl.pipe(z.string().min(1, "Google Maps link is required")),
  googleMapsEmbedUrl: z
    .string()
    .transform(clean)
    .transform((v) => {
      // Accept a full <iframe ...> snippet and extract its src.
      const m = /src=["']([^"']+)["']/i.exec(v);
      return m ? m[1].replace(/&amp;/g, "&") : v;
    })
    .pipe(
      z
        .string()
        .max(2000)
        .refine((v) => v === "" || /^https:\/\/www\.google\.com\/maps\/embed\?/i.test(v), "Must be a Google Maps embed link (https://www.google.com/maps/embed?...)"),
    ),
  locationDescription: text(200),
  googleBusinessUrl: optionalUrl,
});

export const roomSchema = z.object({
  name: required("Room name", 80),
  slug: z
    .string()
    .transform(clean)
    .pipe(z.string().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$|^$/, "Use lowercase letters, numbers and hyphens only")),
  shortDescription: text(300),
  description: required("Description", 5000),
  price: intInRange("Price", 0, 10_000_000),
  currency: z.string().transform(clean).pipe(z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. NPR")),
  priceSuffix: text(40),
  bedDescription: required("Bed description", 200),
  capacityDescription: text(300),
  status: z.enum(["AVAILABLE", "UNAVAILABLE"]),
  featured: z.boolean(),
  sortOrder: intInRange("Sort order", 0, 1000),
  metaTitle: text(120),
  metaDescription: text(300),
});

export const facilitySchema = z.object({
  name: required("Facility name", 100),
  description: text(300),
  icon: z.string().max(40),
  active: z.boolean(),
});

export const faqSchema = z.object({
  question: required("Question", 300),
  answer: required("Answer", 3000),
  active: z.boolean(),
});

export const galleryImageSchema = z.object({
  title: required("Title", 150),
  caption: text(500),
  alt: required("Alt text", 250),
  credit: text(250),
  categoryId: z.string().uuid().or(z.literal("")),
  isHotelPhoto: z.boolean(),
  featured: z.boolean(),
});

export const sectionSchema = z.object({
  heading: text(200),
  body: text(10000),
  imageAlt: text(250),
  imageCredit: text(250),
});

export const pageMetaSchema = z.object({
  title: text(150),
  intro: text(2000),
  metaTitle: text(120),
  metaDescription: text(300),
});

export const seoSettingsSchema = z.object({
  siteTitle: required("Site title", 120),
  titleTemplate: required("Title template", 120).refine((v) => v.includes("%s"), "Template must contain %s"),
  defaultDescription: required("Default description", 300),
  googleSiteVerification: text(200),
});

export const bookingAdminSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CONFIRMED", "CANCELLED", "COMPLETED"]),
  adminNotes: text(5000),
});

export const messageStatusSchema = z.enum(["NEW", "READ", "REPLIED", "ARCHIVED"]);

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(200),
    newPassword: z.string().min(12, "New password must be at least 12 characters").max(200),
    confirmPassword: z.string().max(200),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export const accountSchema = z.object({
  name: required("Name", 100),
  notificationEmail: z
    .string()
    .transform((s) => clean(s).toLowerCase())
    .pipe(z.email("Please enter a valid email").or(z.literal(""))),
});

export type FieldErrors = Record<string, string[] | undefined>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

// ─────────────────────────────────────────────
// Reservations & physical rooms (admin only)
// ─────────────────────────────────────────────

const optionalEmail = z
  .string()
  .transform((s) => clean(s).toLowerCase())
  .pipe(z.email("Please enter a valid email address").max(254).or(z.literal("")));

export const RESERVATION_STATUSES = ["INQUIRY", "PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"] as const;
const PAYMENT_STATUSES = ["UNPAID", "PARTIAL", "PAID", "REFUNDED"] as const;
const BOOKING_SOURCES = ["WEBSITE", "WALK_IN", "PHONE", "WHATSAPP", "OTHER"] as const;

export const reservationSchema = z.object({
  guestName: required("Guest name", 100),
  phone,
  email: optionalEmail,
  country: text(80),
  checkIn: isoDate("Check-in"),
  checkOut: isoDate("Check-out"),
  guests: intInRange("Number of guests", 1, 50),
  roomId: z.string().uuid("Please choose a room type"),
  numberOfRooms: intInRange("Number of rooms", 1, 8),
  unitIds: z.array(z.string().uuid()).max(8),
  source: z.enum(BOOKING_SOURCES),
  status: z.enum(RESERVATION_STATUSES),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  amount: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number({ error: "Amount must be a number" }).int("Use whole numbers").min(0).max(100_000_000).nullable()),
  adminNotes: text(5000),
  inquiryId: z.string().uuid().or(z.literal("")).optional(),
}).refine((v) => v.checkOut > v.checkIn || (v.status === "CHECKED_OUT" && v.checkOut === v.checkIn), { path: ["checkOut"], message: "Check-out must be after check-in" })
  .refine((v) => (Date.parse(v.checkOut) - Date.parse(v.checkIn)) / 86_400_000 <= 366, { path: ["checkOut"], message: "Stays longer than a year are not supported" });

export const roomUnitSchema = z.object({
  name: required("Room name", 40),
  code: z
    .string()
    .transform((s) => clean(s).toUpperCase())
    .pipe(z.string().min(1, "Code is required").max(20).regex(/^[A-Z0-9][A-Z0-9-]*$/, "Use letters, numbers and hyphens, e.g. STD-7")),
  notes: text(200),
});

// ─────────────────────────────────────────────
// Owner notifications (Admin → Settings)
// ─────────────────────────────────────────────

export const notificationSettingsSchema = z.object({
  notificationEmail: z
    .string()
    .transform((s) => clean(s).toLowerCase())
    .pipe(z.email("Please enter a valid email address").or(z.literal(""))),
  notifyEmail: z.boolean(),
});
