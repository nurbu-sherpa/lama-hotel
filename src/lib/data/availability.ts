import "server-only";
import { unstable_cache } from "next/cache";
import { AVAILABILITY_TAG } from "@/config/site";
import { addDays, getCategoryAvailability, isDateStr, nightsBetween, type AvailabilityStatus } from "@/lib/availability";
import { todayInNepal } from "@/lib/utils/format";
import { getHotel } from "./public";

/**
 * PUBLIC availability — aggregated counts per room type ONLY.
 * Never returns guest names, contact details, room assignments or notes.
 */
export type PublicAvailability = { slug: string; available: number; total: number; status: AvailabilityStatus };

const cached = unstable_cache(
  async (from: string, to: string): Promise<PublicAvailability[]> => {
    const rows = await getCategoryAvailability(from, to);
    // Explicitly pick safe fields — nothing else leaves this function.
    return rows.map((r) => ({ slug: r.slug, available: r.available, total: r.total, status: r.status }));
  },
  ["public-availability"],
  { tags: [AVAILABILITY_TAG], revalidate: 300 },
);

/** Returns null when the owner hasn't enabled public availability (then the site shows normal room info). */
export async function getPublicAvailability(from?: string, to?: string): Promise<PublicAvailability[] | null> {
  const hotel = await getHotel();
  if (!hotel.showPublicAvailability) return null;
  const today = todayInNepal();
  const start = from && isDateStr(from) ? from : today;
  const end = to && isDateStr(to) && to > start ? to : addDays(start, 1);
  if (start < today || nightsBetween(start, end) > 60 || nightsBetween(today, start) > 730) return null;
  try {
    return await cached(start, end);
  } catch (err) {
    console.error("Availability lookup failed", err);
    return null;
  }
}
