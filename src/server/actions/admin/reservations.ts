"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AVAILABILITY_TAG } from "@/config/site";
import { busyUnits, computeCategoryAvailability, isDateStr, loadCategories, loadOccupying } from "@/lib/availability";
import { reservationSchema, RESERVATION_STATUSES } from "@/lib/validation/schemas";
import { todayInNepal } from "@/lib/utils/format";
import { changeReservationStatus, saveReservation } from "@/server/services/reservations";
import { adminMutation, idSchema, readForm, type ActionState } from "./helpers";

// Reservations change availability (shown publicly in aggregate) but not other site content.
const availabilityOnly = { tags: [AVAILABILITY_TAG] };

const FIELDS = ["guestName", "phone", "email", "country", "checkIn", "checkOut", "guests", "roomId", "numberOfRooms", "source", "status", "paymentStatus", "amount", "adminNotes", "inquiryId"];

function parse(fd: FormData) {
  const raw = readForm(fd, FIELDS);
  raw.unitIds = fd.getAll("unitIds").map(String).filter(Boolean);
  return reservationSchema.parse(raw);
}

export async function createReservation(_p: ActionState, fd: FormData) {
  let newId: string | null = null;
  const result = await adminMutation(async () => {
    const data = parse(fd);
    if (data.inquiryId) {
      const inquiry = await prisma.bookingInquiry.findUnique({ where: { id: data.inquiryId }, select: { id: true } });
      if (!inquiry) return { ok: false, message: "The original inquiry no longer exists." };
    }
    const r = await saveReservation({ ...data, inquiryId: data.inquiryId || null });
    newId = r.id;
    return "Reservation created. Availability has been updated.";
  }, availabilityOnly);
  if (result.ok && newId) redirect(`/admin/reservations/${newId}?created=1`);
  return result;
}

export async function updateReservation(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const { inquiryId: _ignored, ...data } = parse(fd); // the inquiry link can't be changed after creation
    void _ignored;
    const saved = await saveReservation(data, id);
    return `Reservation saved.${assignedNote(saved.autoAssigned)}`;
  }, availabilityOnly);
}

const QUICK_MESSAGES: Record<string, string> = {
  CONFIRMED: "Reservation confirmed.",
  CHECKED_IN: "Guest checked in.",
  CHECKED_OUT: "Guest checked out. The room is available again.",
  CANCELLED: "Reservation cancelled. The room is available again.",
  NO_SHOW: "Marked as no-show. The room is available again.",
  PENDING: "Reservation set to pending.",
};

function assignedNote(names: string[]) {
  return names.length ? ` Assigned ${names.join(", ")} automatically.` : "";
}

export async function setReservationStatus(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const status = z.enum(RESERVATION_STATUSES).parse(fd.get("status"));
    const saved = await changeReservationStatus(id, status, todayInNepal());
    return `${QUICK_MESSAGES[status] ?? "Status updated."}${assignedNote(saved.autoAssigned)}`;
  }, availabilityOnly);
}

export async function deleteReservation(_p: ActionState, fd: FormData) {
  const result = await adminMutation(async () => {
    await prisma.reservation.delete({ where: { id: idSchema.parse(fd.get("id")) } });
    return "Reservation deleted.";
  }, availabilityOnly);
  if (result.ok) redirect("/admin/reservations");
  return result;
}

export type UnitAvailability = {
  categoryAvailable: number;
  categoryTotal: number;
  units: { id: string; name: string; active: boolean; busyWith: string | null }[];
};

/**
 * Live room availability for the reservation form (admin only).
 * Purely informational — saveReservation() re-checks everything on the server.
 */
export async function checkRoomAvailability(roomId: string, checkIn: string, checkOut: string, excludeId?: string): Promise<UnitAvailability | null> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(roomId).success || !isDateStr(checkIn) || !isDateStr(checkOut) || checkOut <= checkIn) return null;
  if (excludeId && !z.string().uuid().safeParse(excludeId).success) return null;

  const [units, categories, occupying] = await Promise.all([
    prisma.roomUnit.findMany({ where: { roomId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, active: true } }),
    loadCategories(),
    loadOccupying(prisma, checkIn, checkOut, roomId),
  ]);
  const others = occupying.filter((r) => r.id !== excludeId);
  const busy = busyUnits(others, checkIn, checkOut);
  const cat = computeCategoryAvailability(categories.filter((c) => c.id === roomId), others, checkIn, checkOut)[0];
  return {
    categoryAvailable: cat?.available ?? 0,
    categoryTotal: cat?.total ?? 0,
    units: units.map((u) => {
      const ids = busy.get(u.id);
      const guest = ids ? others.find((o) => o.id === ids[0])?.guestName ?? "another guest" : null;
      return { id: u.id, name: u.name, active: u.active, busyWith: guest };
    }),
  };
}
