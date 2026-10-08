import { cn } from "@/lib/utils/format";
import type { PublicAvailability } from "@/lib/data/availability";

/** Aggregated public availability for one room type. Counts only — no guest information. */
function availabilityText(a: Pick<PublicAvailability, "available" | "status">, roomName: string, when = "tonight") {
  const plural = roomName.endsWith("s") ? roomName : `${roomName}s`;
  if (a.status === "FULLY_BOOKED") return `${plural} — fully booked ${when}`;
  if (a.available === 1) return `1 ${roomName} available ${when}`;
  if (a.status === "LIMITED") return `${plural} — limited availability ${when} (${a.available} left)`;
  return `${a.available} ${plural} available ${when}`;
}

export function AvailabilityBadge({ availability, roomName, when, className }: { availability: PublicAvailability; roomName: string; when?: string; className?: string }) {
  const tone =
    availability.status === "FULLY_BOOKED"
      ? "bg-red-50 text-red-800 border-red-100"
      : availability.status === "LIMITED"
        ? "bg-amber-50 text-amber-900 border-amber-100"
        : "bg-forest-50 text-forest-800 border-forest-100";
  return (
    <p className={cn("inline-flex items-center gap-2 rounded-sm border px-2.5 py-1 text-[0.8rem] font-semibold", tone, className)}>
      <span aria-hidden className={cn("h-2 w-2 rounded-full", availability.status === "FULLY_BOOKED" ? "bg-red-500" : availability.status === "LIMITED" ? "bg-amber-500" : "bg-forest-500")} />
      {availabilityText(availability, roomName, when)}
    </p>
  );
}
