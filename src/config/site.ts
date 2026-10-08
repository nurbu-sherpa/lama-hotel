/** Static site configuration. Hotel details themselves live in the database (Admin → Hotel Information). */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

/** Cache tag for all public, admin-editable content. */
export const CONTENT_TAG = "site-content";

/** Cache tag for public (aggregated) availability. Invalidated by every reservation / room change. */
export const AVAILABILITY_TAG = "availability";

export const publicNav = [
  { href: "/", label: "Home" },
  { href: "/rooms", label: "Rooms" },
  { href: "/jiri", label: "Jiri" },
  { href: "/gallery", label: "Gallery" },
  { href: "/location", label: "Location" },
  { href: "/contact", label: "Contact" },
] as const;

export const footerNav = [
  { href: "/rooms", label: "Rooms" },
  { href: "/jiri", label: "Jiri" },
  { href: "/gallery", label: "Gallery" },
  { href: "/location", label: "Location" },
  { href: "/contact", label: "Contact" },
  { href: "/booking", label: "Booking" },
  { href: "/faq", label: "FAQ" },
] as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Cookie holding the time of the last "Clear all" in the admin bell (per device). */
export const NOTIFY_CLEARED_COOKIE = "lama-admin-cleared";
