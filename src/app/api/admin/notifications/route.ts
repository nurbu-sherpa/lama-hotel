import { getAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils/format";

/**
 * Live notification feed for the admin dashboard (polled every ~15s by <AdminNotifier />).
 * Admin-only: returns 401 without a valid session. Never cached.
 */
export const dynamic = "force-dynamic";

export type AdminNotification = {
  id: string;
  type: "booking" | "message";
  title: string;
  detail: string;
  href: string;
  createdAt: string;
};

export async function GET() {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });

  const since = new Date(Date.now() - 14 * 86_400_000);
  const [newBookings, newMessages, bookings, messages] = await Promise.all([
    prisma.bookingInquiry.count({ where: { status: "NEW", archived: false } }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.bookingInquiry.findMany({
      where: { createdAt: { gte: since }, archived: false },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, roomType: true, numberOfRooms: true, checkIn: true, checkOut: true, guests: true, status: true, createdAt: true },
    }),
    prisma.contactMessage.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, message: true, status: true, createdAt: true },
    }),
  ]);

  const items: (AdminNotification & { unread: boolean })[] = [
    ...bookings.map((b) => ({
      id: b.id,
      type: "booking" as const,
      title: `Booking inquiry — ${b.name}`,
      detail: `${b.numberOfRooms} × ${b.roomType} · ${formatDate(b.checkIn)} → ${formatDate(b.checkOut)} · ${b.guests} guests`,
      href: `/admin/bookings/${b.id}`,
      createdAt: b.createdAt.toISOString(),
      unread: b.status === "NEW",
    })),
    ...messages.map((m) => ({
      id: m.id,
      type: "message" as const,
      title: `Message — ${m.name}`,
      detail: m.message.length > 90 ? `${m.message.slice(0, 89)}…` : m.message,
      href: `/admin/messages/${m.id}`,
      createdAt: m.createdAt.toISOString(),
      unread: m.status === "NEW",
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);

  return Response.json(
    { newBookings, newMessages, items, serverTime: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex" } },
  );
}
