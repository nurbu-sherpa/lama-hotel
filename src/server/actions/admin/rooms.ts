"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { roomSchema, roomUnitSchema } from "@/lib/validation/schemas";
import { AVAILABILITY_TAG, CONTENT_TAG } from "@/config/site";
import { OCCUPYING_STATUSES, syncRoomTotals, toDate } from "@/lib/availability";
import { deleteStoredImage, uploadImage } from "@/lib/storage";
import { formatDate, slugify, todayInNepal } from "@/lib/utils/format";
import { adminMutation, idSchema, moveItem, readForm, type ActionState } from "./helpers";

// Room changes affect both the public content and availability counts.
const roomTags = { tags: [CONTENT_TAG, AVAILABILITY_TAG] };

const ROOM_FIELDS = [
  "name",
  "slug",
  "shortDescription",
  "description",
  "price",
  "currency",
  "priceSuffix",
  "bedDescription",
  "capacityDescription",
  "status",
  "sortOrder",
  "metaTitle",
  "metaDescription",
];

function parseRoom(fd: FormData) {
  const data = roomSchema.parse(readForm(fd, ROOM_FIELDS, ["featured"]));
  return { ...data, slug: data.slug || slugify(data.name) };
}

export async function createRoom(_p: ActionState, fd: FormData) {
  let newId: string | null = null;
  const result = await adminMutation(async () => {
    const data = parseRoom(fd);
    const initialUnits = z.coerce.number().int().min(0).max(50).catch(0).parse(fd.get("initialUnits") ?? 0);
    const prefix = data.slug.replace(/[^a-z0-9]/g, "").slice(0, 3).toUpperCase() || "RM";
    const base = data.name.replace(/\s+Room$/i, "");
    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.room.create({ data: { ...data, totalRooms: initialUnits } });
      if (initialUnits > 0) {
        const suffix = created.id.slice(0, 4).toUpperCase();
        await tx.roomUnit.createMany({
          data: Array.from({ length: initialUnits }, (_, i) => ({
            roomId: created.id,
            name: `${base} ${i + 1}`,
            code: `${prefix}${suffix}-${i + 1}`,
            sortOrder: i + 1,
          })),
        });
      }
      return created;
    });
    newId = room.id;
    return "Room created.";
  }, roomTags);
  if (result.ok && newId) redirect(`/admin/rooms/${newId}?created=1`);
  return result;
}

export async function updateRoom(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    await prisma.room.update({ where: { id }, data: parseRoom(fd) });
    return "Room saved. The website now shows the updated details.";
  });
}

export async function deleteRoom(_p: ActionState, fd: FormData) {
  const result = await adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const reservations = await prisma.reservation.count({ where: { roomId: id } });
    if (reservations > 0) {
      return {
        ok: false,
        message: `This room type has ${reservations} reservation(s) and can't be deleted. Set Availability to “Unavailable” instead, or delete those reservations first.`,
      };
    }
    const images = await prisma.roomImage.findMany({ where: { roomId: id }, select: { storageKey: true } });
    // Booking inquiries keep their room-type snapshot (roomId is set to null).
    await prisma.$transaction([prisma.roomUnit.deleteMany({ where: { roomId: id } }), prisma.room.delete({ where: { id } })]);
    await Promise.all(images.map((i) => deleteStoredImage(i.storageKey)));
    return "Room deleted.";
  }, roomTags);
  if (result.ok) redirect("/admin/rooms");
  return result;
}

export async function moveRoom(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const direction = z.enum(["up", "down"]).parse(fd.get("direction"));
    const rooms = await prisma.room.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, sortOrder: true } });
    await moveItem(rooms, id, direction, (rid, sortOrder) => prisma.room.update({ where: { id: rid }, data: { sortOrder } }));
    return "Order updated.";
  });
}

// ── Room photos ──────────────────────────────

const imageMeta = z.object({
  alt: z.string().trim().min(1, "Please describe the photo (alt text)").max(250),
  caption: z.string().trim().max(300),
});

export async function uploadRoomImage(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const roomId = idSchema.parse(fd.get("roomId"));
    const meta = imageMeta.parse(readForm(fd, ["alt", "caption"]));
    const { url, storageKey } = await uploadImage(fd.get("file"), "rooms");
    const count = await prisma.roomImage.count({ where: { roomId } });
    await prisma.roomImage.create({ data: { roomId, url, storageKey, ...meta, sortOrder: count + 1 } });
    return "Photo uploaded.";
  });
}

export async function updateRoomImage(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    await prisma.roomImage.update({ where: { id }, data: imageMeta.parse(readForm(fd, ["alt", "caption"])) });
    return "Photo details saved.";
  });
}

export async function deleteRoomImage(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const img = await prisma.roomImage.delete({ where: { id } });
    await deleteStoredImage(img.storageKey);
    return "Photo deleted.";
  });
}

export async function moveRoomImage(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const direction = z.enum(["up", "down"]).parse(fd.get("direction"));
    const img = await prisma.roomImage.findUniqueOrThrow({ where: { id }, select: { roomId: true } });
    const all = await prisma.roomImage.findMany({ where: { roomId: img.roomId }, orderBy: { sortOrder: "asc" }, select: { id: true, sortOrder: true } });
    await moveItem(all, id, direction, (iid, sortOrder) => prisma.roomImage.update({ where: { id: iid }, data: { sortOrder } }));
    return "Order updated.";
  });
}

// ── Physical rooms (RoomUnit) ──────────────────────────────
// Every change re-syncs Room.totalRooms, so category inventory can never disagree with the physical rooms.

async function nextOccupyingUse(unitId: string) {
  return prisma.reservationRoom.findFirst({
    where: {
      roomUnitId: unitId,
      reservation: { status: { in: [...OCCUPYING_STATUSES] }, checkOut: { gt: toDate(todayInNepal()) } },
    },
    select: { reservation: { select: { guestName: true, checkIn: true, checkOut: true } } },
    orderBy: { reservation: { checkIn: "asc" } },
  });
}

export async function createRoomUnit(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const roomId = idSchema.parse(fd.get("roomId"));
    const data = roomUnitSchema.parse(readForm(fd, ["name", "code", "notes"]));
    await prisma.$transaction(async (tx) => {
      const max = await tx.roomUnit.aggregate({ where: { roomId }, _max: { sortOrder: true } });
      await tx.roomUnit.create({ data: { ...data, roomId, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
      await syncRoomTotals(tx, roomId);
    });
    return `“${data.name}” added. It is now bookable.`;
  }, roomTags);
}

export async function updateRoomUnit(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const data = roomUnitSchema.parse(readForm(fd, ["name", "code", "notes"]));
    await prisma.roomUnit.update({ where: { id }, data });
    return "Room saved.";
  }, roomTags);
}

export async function toggleRoomUnit(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const unit = await prisma.roomUnit.findUniqueOrThrow({ where: { id }, select: { active: true, roomId: true, name: true } });
    if (unit.active) {
      const use = await nextOccupyingUse(id);
      if (use) {
        return {
          ok: false,
          message: `${unit.name} is assigned to ${use.reservation.guestName} (${formatDate(use.reservation.checkIn)} → ${formatDate(use.reservation.checkOut)}). Move that reservation to another room first.`,
        };
      }
    }
    await prisma.$transaction(async (tx) => {
      await tx.roomUnit.update({ where: { id }, data: { active: !unit.active } });
      await syncRoomTotals(tx, unit.roomId);
    });
    return unit.active ? `${unit.name} is now out of service (not bookable).` : `${unit.name} is bookable again.`;
  }, roomTags);
}

export async function deleteRoomUnit(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const unit = await prisma.roomUnit.findUniqueOrThrow({ where: { id }, select: { roomId: true, name: true, _count: { select: { assignments: true } } } });
    if (unit._count.assignments > 0) {
      return { ok: false, message: `${unit.name} has reservation history and can't be deleted. Mark it “out of service” instead.` };
    }
    await prisma.$transaction(async (tx) => {
      await tx.roomUnit.delete({ where: { id } });
      await syncRoomTotals(tx, unit.roomId);
    });
    return `${unit.name} deleted.`;
  }, roomTags);
}

export async function moveRoomUnit(_p: ActionState, fd: FormData) {
  return adminMutation(async () => {
    const id = idSchema.parse(fd.get("id"));
    const direction = z.enum(["up", "down"]).parse(fd.get("direction"));
    const unit = await prisma.roomUnit.findUniqueOrThrow({ where: { id }, select: { roomId: true } });
    const all = await prisma.roomUnit.findMany({ where: { roomId: unit.roomId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, sortOrder: true } });
    await moveItem(all, id, direction, (uid, sortOrder) => prisma.roomUnit.update({ where: { id: uid }, data: { sortOrder } }));
    return "Order updated.";
  }, roomTags);
}
