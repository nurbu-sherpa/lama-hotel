/**
 * Pure availability logic (no database access) — shared by the admin, the public site and the tests.
 *
 * Date model: dates are "YYYY-MM-DD" strings (hotel-local calendar dates).
 * A stay occupies the NIGHTS [checkIn, checkOut): 10 → 12 June occupies the nights of 10 and 11 June,
 * and the room is free again for the night of 12 June.
 */

/** Statuses that hold a room. INQUIRY, CANCELLED and NO_SHOW never occupy a room. */
export const OCCUPYING_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] as const;
export type OccupyingStatus = (typeof OCCUPYING_STATUSES)[number];

export function isOccupying(status: string): status is OccupyingStatus {
  return (OCCUPYING_STATUSES as readonly string[]).includes(status);
}

export const MAX_RANGE_NIGHTS = 62;

const DAY = 86_400_000;

export function isDateStr(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

export function toDate(s: string) {
  return new Date(`${s}T00:00:00Z`);
}

export function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number) {
  return toDateStr(new Date(toDate(s).getTime() + n * DAY));
}

export function nightsBetween(from: string, to: string) {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY);
}

/** Every night in [from, to). */
export function eachNight(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d < to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Half-open interval overlap: [aIn, aOut) ∩ [bIn, bOut) ≠ ∅ */
export function overlaps(aIn: string, aOut: string, bIn: string, bOut: string) {
  return aIn < bOut && aOut > bIn;
}

export type AvailabilityStatus = "AVAILABLE" | "LIMITED" | "FULLY_BOOKED";

/** LIMITED when only a few rooms are left (≤ one third of the category, minimum 1). */
export function availabilityStatus(available: number, total: number): AvailabilityStatus {
  if (available <= 0) return "FULLY_BOOKED";
  if (available <= Math.max(1, Math.floor(total / 3))) return "LIMITED";
  return "AVAILABLE";
}

export type ResLite = {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  numberOfRooms: number;
  status: string;
  unitIds: string[];
};

/** Rooms a reservation uses: the larger of rooms requested and rooms actually assigned. */
export function roomsUsed(r: Pick<ResLite, "numberOfRooms" | "unitIds">) {
  return Math.max(r.numberOfRooms, r.unitIds.length);
}

export type CategoryInput = { id: string; name: string; totalUnits: number };

export type CategoryAvailability = {
  roomId: string;
  name: string;
  total: number;
  /** Highest number of rooms booked on any night in the range. */
  booked: number;
  /** Rooms free for EVERY night of the range. */
  available: number;
  status: AvailabilityStatus;
  nights: { date: string; booked: number; available: number }[];
};

/** Category (room type) availability for the range [from, to). */
export function computeCategoryAvailability(categories: CategoryInput[], reservations: ResLite[], from: string, to: string): CategoryAvailability[] {
  const nights = eachNight(from, to);
  return categories.map((c) => {
    const relevant = reservations.filter((r) => r.roomId === c.id && isOccupying(r.status) && overlaps(r.checkIn, r.checkOut, from, to));
    const perNight = nights.map((date) => {
      const booked = relevant.filter((r) => r.checkIn <= date && date < r.checkOut).reduce((n, r) => n + roomsUsed(r), 0);
      return { date, booked, available: Math.max(0, c.totalUnits - booked) };
    });
    const booked = perNight.reduce((m, n) => Math.max(m, n.booked), 0);
    const available = Math.max(0, c.totalUnits - booked);
    return { roomId: c.id, name: c.name, total: c.totalUnits, booked, available, status: availabilityStatus(available, c.totalUnits), nights: perNight };
  });
}

export type Candidate = {
  id?: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  numberOfRooms: number;
  status: string;
  unitIds: string[];
};

export type Conflict =
  | { kind: "unit"; unitId: string; date: string; otherReservationId: string }
  | { kind: "capacity"; date: string; booked: number; total: number };

/**
 * Server-side conflict check for a reservation being created/updated.
 * - A physical room can hold only one occupying reservation per night.
 * - A room type can't be booked beyond its number of active physical rooms on any night.
 * Non-occupying statuses (INQUIRY, CANCELLED, NO_SHOW) never conflict.
 */
export function findConflicts(candidate: Candidate, others: ResLite[], totalUnits: number): Conflict[] {
  if (!isOccupying(candidate.status)) return [];
  const conflicts: Conflict[] = [];
  const active = others.filter((o) => o.id !== candidate.id && isOccupying(o.status) && overlaps(o.checkIn, o.checkOut, candidate.checkIn, candidate.checkOut));

  for (const unitId of candidate.unitIds) {
    for (const o of active) {
      if (o.unitIds.includes(unitId)) {
        const date = candidate.checkIn > o.checkIn ? candidate.checkIn : o.checkIn;
        conflicts.push({ kind: "unit", unitId, date, otherReservationId: o.id });
      }
    }
  }

  const sameType = active.filter((o) => o.roomId === candidate.roomId);
  for (const date of eachNight(candidate.checkIn, candidate.checkOut)) {
    const booked = sameType.filter((o) => o.checkIn <= date && date < o.checkOut).reduce((n, o) => n + roomsUsed(o), 0) + roomsUsed(candidate);
    if (booked > totalUnits) {
      conflicts.push({ kind: "capacity", date, booked, total: totalUnits });
      break; // first night is enough to explain the problem
    }
  }
  return conflicts;
}

/** Unit → set of reservation ids occupying it at any point in [from, to). */
export function busyUnits(reservations: ResLite[], from: string, to: string, excludeId?: string) {
  const busy = new Map<string, string[]>();
  for (const r of reservations) {
    if (r.id === excludeId || !isOccupying(r.status) || !overlaps(r.checkIn, r.checkOut, from, to)) continue;
    for (const u of r.unitIds) busy.set(u, [...(busy.get(u) ?? []), r.id]);
  }
  return busy;
}

/**
 * One guest (booking inquiry) must not hold two stays on the same night — that's almost always an
 * "extend the stay" done by creating a second reservation, which silently blocks an extra room.
 * Returns the guest's other active stay that overlaps [checkIn, checkOut); back-to-back is fine.
 */
export function findOwnOverlap<T extends { id: string; status: string; checkIn: string; checkOut: string }>(
  guestStays: T[],
  stay: { id?: string; status: string; checkIn: string; checkOut: string },
): T | undefined {
  if (!isOccupying(stay.status)) return undefined;
  return guestStays.find((s) => s.id !== stay.id && isOccupying(s.status) && overlaps(s.checkIn, s.checkOut, stay.checkIn, stay.checkOut));
}
