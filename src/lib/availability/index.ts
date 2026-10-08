import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { OCCUPYING_STATUSES, computeCategoryAvailability, toDate, toDateStr, type ResLite } from "./core";

export * from "./core";

type Db = PrismaClient | Prisma.TransactionClient;

/** Occupying reservations overlapping [from, to) — uses the (status, checkIn, checkOut) index. */
export async function loadOccupying(db: Db, from: string, to: string, roomId?: string) {
  const rows = await db.reservation.findMany({
    where: {
      status: { in: [...OCCUPYING_STATUSES] },
      checkIn: { lt: toDate(to) },
      checkOut: { gt: toDate(from) },
      ...(roomId ? { roomId } : {}),
    },
    select: {
      id: true,
      roomId: true,
      checkIn: true,
      checkOut: true,
      numberOfRooms: true,
      status: true,
      guestName: true,
      assignments: { select: { roomUnitId: true } },
    },
    orderBy: { checkIn: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    roomId: r.roomId,
    checkIn: toDateStr(r.checkIn),
    checkOut: toDateStr(r.checkOut),
    numberOfRooms: r.numberOfRooms,
    status: r.status as string,
    unitIds: r.assignments.map((a) => a.roomUnitId),
    guestName: r.guestName, // admin-only consumers; public helpers strip this
  })) satisfies (ResLite & { guestName: string })[];
}

export async function loadCategories(db: Db = prisma) {
  const rooms = await db.room.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, _count: { select: { units: { where: { active: true } } } } },
  });
  return rooms.map((r) => ({ id: r.id, name: r.name, slug: r.slug, totalUnits: r._count.units }));
}

/** Room-type availability computed from real reservations in the database. */
export async function getCategoryAvailability(from: string, to: string, db: Db = prisma) {
  const [categories, reservations] = await Promise.all([loadCategories(db), loadOccupying(db, from, to)]);
  const result = computeCategoryAvailability(categories, reservations, from, to);
  return result.map((r) => ({ ...r, slug: categories.find((c) => c.id === r.roomId)!.slug }));
}

/** Keep Room.totalRooms equal to the number of active physical rooms. */
export async function syncRoomTotals(db: Db, roomId: string) {
  const count = await db.roomUnit.count({ where: { roomId, active: true } });
  await db.room.update({ where: { id: roomId }, data: { totalRooms: count } });
  return count;
}
