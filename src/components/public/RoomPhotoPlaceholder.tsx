import { BedDouble } from "lucide-react";
import { cn } from "@/lib/utils/format";

/**
 * Shown until the owner uploads real room photos (Admin → Rooms → Photos).
 * Deliberately NOT a stock photo, so nobody mistakes it for the actual room.
 */
export function RoomPhotoPlaceholder({ roomName, className }: { roomName: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`Photos of the ${roomName} coming soon`}
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-cream-100 via-cream-200 to-clay-100 text-forest-800",
        className,
      )}
    >
      <svg className="absolute inset-x-0 bottom-0 h-1/2 w-full text-forest-800/10" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden>
        <path d="M0 120 L0 80 L60 40 L110 70 L170 20 L230 65 L290 30 L350 70 L400 50 L400 120 Z" fill="currentColor" />
      </svg>
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-sm">
        <BedDouble size={26} aria-hidden />
      </span>
      <span className="relative mt-3 font-display text-lg">{roomName}</span>
      <span className="relative mt-1 text-xs font-medium tracking-wide text-muted uppercase">Room photos coming soon</span>
    </div>
  );
}
