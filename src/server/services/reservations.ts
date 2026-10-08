import "server-only";
import { Prisma, type BookingSource, type PaymentStatus, type ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { busyUnits, findConflicts, findOwnOverlap, isOccupying, loadOccupying, toDate, toDateStr } from "@/lib/availability";
import { formatDate } from "@/lib/utils/format";

export class ReservationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

export type ReservationInput = {
  guestName: string;
  phone: string;
  email: string;
  country: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  roomId: string;
  numberOfRooms: number;
  unitIds: string[];
  source: BookingSource;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  amount: number | null;
  adminNotes: string;
  inquiryId?: string | null;
};

const MAX_RETRIES = 3;

/** Run in a SERIALIZABLE transaction and retry on serialization failures (P2034). */
async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 });
    } catch (err) {
      const retryable = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
      if (!retryable || attempt >= MAX_RETRIES) throw err;
    }
  }
}

/**
 * Create or update a reservation with server-side conflict protection.
 * The availability check and the write happen in the same serializable transaction,
 * so two simultaneous saves can never double-book a physical room.
 */
export async function saveReservation(input: ReservationInput, id?: string) {
  // A checked-out guest who left on their arrival day is recorded as a 0-night stay (it frees the room).
  const zeroNightCheckout = input.status === "CHECKED_OUT" && input.checkOut === input.checkIn;
  if (input.checkOut <= input.checkIn && !zeroNightCheckout) throw new ReservationError("Check-out must be after check-in.", "checkOut");
  const requestedUnitIds = [...new Set(input.unitIds)];
  if (requestedUnitIds.length > input.numberOfRooms) {
    throw new ReservationError(`You assigned ${requestedUnitIds.length} rooms but the reservation is for ${input.numberOfRooms}. Increase “Number of rooms” or unassign a room.`, "unitIds");
  }

  return serializable(async (tx) => {
    const unitIds = [...requestedUnitIds];
    /** Names of rooms assigned automatically during check-in (reported back to the admin). */
    const autoAssigned: string[] = [];
    const room = await tx.room.findUnique({ where: { id: input.roomId }, select: { id: true, name: true } });
    if (!room) throw new ReservationError("Please choose a room type.", "roomId");

    const units = await tx.roomUnit.findMany({
      where: { roomId: room.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, active: true },
    });
    const unitName = new Map(units.map((u) => [u.id, u.name]));
    for (const u of unitIds) {
      const unit = units.find((x) => x.id === u);
      if (!unit) throw new ReservationError(`The selected room doesn't belong to ${room.name}.`, "unitIds");
      if (!unit.active && isOccupying(input.status)) throw new ReservationError(`${unit.name} is inactive and can't be booked.`, "unitIds");
    }
    const totalUnits = units.filter((u) => u.active).length;

    let inquiryId = input.inquiryId ?? null;
    if (id) {
      const existing = await tx.reservation.findUnique({ where: { id }, select: { id: true, inquiryId: true } });
      if (!existing) throw new ReservationError("This reservation no longer exists.");
      inquiryId = existing.inquiryId;
    }

    // One guest (inquiry) can't hold two overlapping stays — see findOwnOverlap.
    if (inquiryId && isOccupying(input.status)) {
      const guestStays = await tx.reservation.findMany({
        where: { inquiryId },
        select: { id: true, status: true, roomType: true, checkIn: true, checkOut: true },
      });
      const overlap = findOwnOverlap(
        guestStays.map((s) => ({ ...s, checkIn: toDateStr(s.checkIn), checkOut: toDateStr(s.checkOut) })),
        { id, status: input.status, checkIn: input.checkIn, checkOut: input.checkOut },
      );
      if (overlap) {
        throw new ReservationError(
          `This guest already has a reservation for ${formatDate(overlap.checkIn)} → ${formatDate(overlap.checkOut)} (${overlap.roomType}). To extend the stay, open that reservation and change its Check-out. For more rooms, increase “Number of rooms” there.`,
          "checkIn",
        );
      }
    }

    const others = await loadOccupying(tx, input.checkIn, input.checkOut);

    // Checking a guest in needs a physical room for every booked room. If some are still
    // unassigned, pick free rooms of the same type automatically (inside this same
    // serializable transaction, so it can never double-book).
    if (input.status === "CHECKED_IN" && unitIds.length < input.numberOfRooms) {
      const busy = busyUnits(others, input.checkIn, input.checkOut, id);
      const free = units.filter((u) => u.active && !busy.has(u.id) && !unitIds.includes(u.id));
      const needed = input.numberOfRooms - unitIds.length;
      if (free.length < needed) {
        throw new ReservationError(
          `Can't check in: ${needed === 1 ? "a room" : `${needed} rooms`} must be assigned, but only ${free.length} ${room.name}${free.length === 1 ? " is" : "s are"} free for these dates. Assign a room manually or change the room type.`,
          "unitIds",
        );
      }
      for (const u of free.slice(0, needed)) {
        unitIds.push(u.id);
        autoAssigned.push(u.name);
      }
    }

    const conflicts = findConflicts({ id, roomId: room.id, checkIn: input.checkIn, checkOut: input.checkOut, numberOfRooms: input.numberOfRooms, status: input.status, unitIds }, others, totalUnits);

    const unitConflict = conflicts.find((c) => c.kind === "unit");
    if (unitConflict && unitConflict.kind === "unit") {
      const other = others.find((o) => o.id === unitConflict.otherReservationId);
      throw new ReservationError(
        `${unitName.get(unitConflict.unitId) ?? "That room"} is already booked${other ? ` by ${other.guestName} (${formatDate(other.checkIn)} → ${formatDate(other.checkOut)})` : ""}. Please choose another room.`,
        "unitIds",
      );
    }
    const capacity = conflicts.find((c) => c.kind === "capacity");
    if (capacity && capacity.kind === "capacity") {
      throw new ReservationError(
        `Not enough ${room.name}s on the night of ${formatDate(capacity.date)}: this would need ${capacity.booked} but only ${capacity.total} exist. Change the dates, the number of rooms or the room type.`,
        "numberOfRooms",
      );
    }

    const data = {
      guestName: input.guestName,
      phone: input.phone,
      email: input.email,
      country: input.country,
      checkIn: toDate(input.checkIn),
      checkOut: toDate(input.checkOut),
      guests: input.guests,
      roomId: room.id,
      roomType: room.name,
      numberOfRooms: input.numberOfRooms,
      source: input.source,
      status: input.status,
      paymentStatus: input.paymentStatus,
      amount: input.amount,
      adminNotes: input.adminNotes,
    };

    if (id) {
      await tx.reservationRoom.deleteMany({ where: { reservationId: id } });
      const updated = await tx.reservation.update({
        where: { id },
        data: { ...data, assignments: { create: unitIds.map((roomUnitId) => ({ roomUnitId })) } },
        select: { id: true },
      });
      return { id: updated.id, autoAssigned };
    }

    const created = await tx.reservation.create({
      data: {
        ...data,
        inquiryId: input.inquiryId ?? null,
        assignments: { create: unitIds.map((roomUnitId) => ({ roomUnitId })) },
      },
      select: { id: true },
    });
    // Converting a website inquiry: keep the inquiry, just mark its progress.
    if (input.inquiryId && isOccupying(input.status)) {
      await tx.bookingInquiry.update({ where: { id: input.inquiryId }, data: { status: input.status === "PENDING" ? "CONTACTED" : "CONFIRMED" } });
    }
    return { id: created.id, autoAssigned };
  });
}

/**
 * Quick status changes (check in / check out / cancel / no-show / confirm).
 * Re-runs the full conflict check through saveReservation, so re-activating a
 * cancelled reservation can't create a double booking.
 */
export async function changeReservationStatus(id: string, status: ReservationStatus, today: string) {
  const r = await prisma.reservation.findUnique({ where: { id }, include: { assignments: { select: { roomUnitId: true } } } });
  if (!r) throw new ReservationError("This reservation no longer exists.");
  let checkOut = toDateStr(r.checkOut);
  const checkIn = toDateStr(r.checkIn);

  // Early departure: free the remaining nights straight away.
  // Early departure frees the remaining nights straight away — including a same-day departure,
  // which becomes a 0-night stay so the room is available tonight.
  if (status === "CHECKED_OUT" && today < checkOut) checkOut = today > checkIn ? today : checkIn;

  return saveReservation(
    {
      guestName: r.guestName,
      phone: r.phone,
      email: r.email,
      country: r.country,
      checkIn,
      checkOut,
      guests: r.guests,
      roomId: r.roomId,
      numberOfRooms: r.numberOfRooms,
      unitIds: r.assignments.map((a) => a.roomUnitId),
      source: r.source,
      status,
      paymentStatus: r.paymentStatus,
      amount: r.amount,
      adminNotes: r.adminNotes,
    },
    id,
  );
}
