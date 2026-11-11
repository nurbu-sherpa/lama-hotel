import "server-only";
import { after } from "next/server";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyGuest, notifyOwner } from "@/lib/notify";
import { formatDate, formatPrice } from "@/lib/utils/format";
import type { bookingSchema } from "@/lib/validation/schemas";

export type BookingData = z.infer<ReturnType<typeof bookingSchema>>;

const HOUR = 60 * 60 * 1000;
const MAX_BOOKINGS_PER_HOUR = 5;

/**
 * Save a guest's booking INQUIRY (status NEW) and notify the owner + guest after the response.
 * Shared by the booking form and the chat assistant. It never creates a reservation and never
 * holds a room — only the owner can turn an inquiry into a reservation in the admin.
 */
export async function createBookingInquiry(
  data: BookingData,
  ipHash: string,
  { db = prisma, defer = after }: { db?: Pick<typeof prisma, "room" | "bookingInquiry">; defer?: (task: () => unknown) => void } = {},
): Promise<{ status: "created" | "duplicate"; roomName: string } | { status: "no_room" } | { status: "rate_limited" }> {
  const room = await db.room.findUnique({
    where: { slug: data.roomSlug },
    select: { id: true, name: true, price: true, currency: true, priceSuffix: true },
  });
  if (!room) return { status: "no_room" };

  const recent = await db.bookingInquiry.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - HOUR) } } });
  if (recent >= MAX_BOOKINGS_PER_HOUR) return { status: "rate_limited" };

  const checkIn = new Date(`${data.checkIn}T00:00:00Z`);
  const checkOut = new Date(`${data.checkOut}T00:00:00Z`);

  // Duplicate submission (double click / resubmit) → don't create a second record.
  const duplicate = await db.bookingInquiry.findFirst({
    where: { email: data.email, checkIn, checkOut, roomId: room.id, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
    select: { id: true },
  });
  if (duplicate) return { status: "duplicate", roomName: room.name };

  // 1) Save first — an inquiry must never be lost because email failed.
  const inquiry = await db.bookingInquiry.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      country: data.country,
      checkIn,
      checkOut,
      guests: data.guests, // informational only
      roomId: room.id,
      roomType: room.name,
      numberOfRooms: data.numberOfRooms,
      message: data.message,
      arrivalInfo: data.arrivalInfo,
      requestedRoomPrice: room.price, // snapshot of advertised price — NOT a confirmed price
      currency: room.currency,
      ipHash,
    },
  });

  // 2) Then notify the owner by email AFTER the response is sent (best effort, never throws,
  //    never delays or breaks the guest's submission).
  defer(() =>
    notifyOwner({
      event: "booking_inquiry",
      replyTo: data.email,
      subject: `New booking inquiry — ${room.name}, ${formatDate(checkIn)}`,
      rows: [
        ["Name", data.name],
        ["Email", data.email],
        ["Phone", data.phone],
        ["Country", data.country],
        ["Check-in", formatDate(checkIn)],
        ["Check-out", formatDate(checkOut)],
        ["Room type", `${room.name} (${formatPrice(room.price, room.currency)} ${room.priceSuffix})`],
        ["Number of rooms", String(data.numberOfRooms)],
        ["Guests", String(data.guests)],
        ["Arrival info", data.arrivalInfo],
        ["Message", data.message],
        ["Reference", inquiry.id],
      ],
    }),
  );

  // 3) Thank-you email to the guest (also best effort, after the response).
  defer(() =>
    notifyGuest({
      to: data.email,
      name: data.name,
      rows: [
        ["Name", data.name],
        ["Phone", data.phone],
        ["Check-in", formatDate(checkIn)],
        ["Check-out", formatDate(checkOut)],
        ["Room type", room.name],
        ["Number of rooms", String(data.numberOfRooms)],
        ["Guests", String(data.guests)],
        ["Arrival info", data.arrivalInfo],
        ["Message", data.message],
        ["Reference", inquiry.id],
      ],
    }),
  );

  return { status: "created", roomName: room.name };
}
