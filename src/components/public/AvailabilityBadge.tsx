import { cn } from "@/lib/utils/format";
import type { PublicAvailability } from "@/lib/data/availability";
import { toneFor } from "@/components/admin/ui";

/** Aggregated public availability for one room type. Counts only — no guest information. */
function availabilityText(a: Pick<PublicAvailability, "available" | "status">, roomName: string, when = "tonight") {
  const plural = roomName.endsWith("s") ? roomName : `${roomName}s`;
  if (a.status === "FULLY_BOOKED") return `${plural} — fully booked ${when}`;
  if (a.available === 1) return `1 ${roomName} available ${when}`;
  if (a.status === "LIMITED") return `${plural} — limited availability ${when} (${a.available} left)`;
  return `${a.available} ${plural} available ${when}`;
}

export function AvailabilityBadge({ availability, roomName, when, className }: { availability: PublicAvailability; roomName: string; when?: string; className?: string }) {
  return (
    <p className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-[0.8rem]", toneFor(availability.status).badge, className)}>
      {availabilityText(availability, roomName, when)}
    </p>
  );
}
