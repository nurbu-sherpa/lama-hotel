import Link from "next/link";
import { ArrowRight, Camera, ImagePlus, Link2, Sparkles } from "lucide-react";
import { addDays, getCategoryAvailability, toDate } from "@/lib/availability";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, todayInNepal } from "@/lib/utils/format";
import { AdminPageTitle, EmptyState, Panel, StatusBadge, statusLabel } from "@/components/admin/ui";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const todayStr = todayInNepal();
  const today = toDate(todayStr);
  const tonight = await getCategoryAvailability(todayStr, addDays(todayStr, 1));

  const [arrivals, departures, inHouse, pendingInquiries, upcomingConfirmed, recentReservations, recentInquiries, recentMessages, hotelPhotos, roomPhotos, hotel] = await Promise.all([
    prisma.reservation.findMany({
      where: { checkIn: today, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] } },
      orderBy: { guestName: "asc" },
      select: { id: true, guestName: true, status: true, roomType: true, numberOfRooms: true, assignments: { select: { roomUnit: { select: { name: true } } } } },
    }),
    prisma.reservation.findMany({
      where: { checkOut: today, status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] } },
      orderBy: { guestName: "asc" },
      select: { id: true, guestName: true, status: true, roomType: true, numberOfRooms: true, assignments: { select: { roomUnit: { select: { name: true } } } } },
    }),
    prisma.reservation.count({ where: { status: "CHECKED_IN" } }),
    prisma.bookingInquiry.count({ where: { status: { in: ["NEW", "CONTACTED"] }, archived: false, reservations: { none: {} } } }),
    prisma.reservation.count({ where: { status: "CONFIRMED", checkOut: { gt: today } } }),
    prisma.reservation.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, guestName: true, roomType: true, checkIn: true, checkOut: true, status: true, source: true },
    }),
    prisma.bookingInquiry.findMany({
      where: { archived: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, roomType: true, checkIn: true, checkOut: true, status: true, createdAt: true },
    }),
    prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, message: true, status: true, createdAt: true } }),
    prisma.galleryImage.count({ where: { isHotelPhoto: true } }),
    prisma.roomImage.count(),
    prisma.hotelSettings.findUnique({ where: { id: "default" }, select: { facebookUrl: true, instagramUrl: true, googleBusinessUrl: true } }),
  ]);

  const totalRooms = tonight.reduce((n, c) => n + c.total, 0);
  const occupiedTonight = tonight.reduce((n, c) => n + c.booked, 0);
  const availableTonight = tonight.reduce((n, c) => n + c.available, 0);

  const stats = [
    { label: "Check-ins today", value: arrivals.length, href: "/admin/reservations?view=arrivals", highlight: arrivals.some((r) => r.status !== "CHECKED_IN") },
    { label: "Check-outs today", value: departures.length, href: "/admin/reservations?view=departures", highlight: departures.some((r) => r.status === "CHECKED_IN") },
    { label: "Rooms occupied / reserved tonight", value: `${occupiedTonight} / ${totalRooms}`, href: "/admin/availability" },
    { label: "Rooms available tonight", value: availableTonight, href: "/admin/availability" },
    { label: "Pending website inquiries", value: pendingInquiries, href: "/admin/bookings?status=OPEN", highlight: pendingInquiries > 0 },
    { label: "Upcoming confirmed reservations", value: upcomingConfirmed, href: "/admin/reservations" },
  ];

  // Honest "to-do" list for the owner.
  const todos = [
    hotelPhotos === 0 && { Icon: Camera, text: "Upload real photos of the hotel (Gallery → mark as “Photo of the hotel”).", href: "/admin/gallery" },
    roomPhotos === 0 && { Icon: ImagePlus, text: "Add photos of your rooms (Rooms → choose a room → Photos).", href: "/admin/rooms" },
    !hotel?.facebookUrl && !hotel?.instagramUrl && { Icon: Link2, text: "Add your Facebook / Instagram links when ready.", href: "/admin/hotel" },
    !hotel?.googleBusinessUrl && { Icon: Link2, text: "Add your Google Business Profile link.", href: "/admin/maps" },
    { Icon: Sparkles, text: "Add any other facilities you offer (only ones you can confirm).", href: "/admin/facilities" },
  ].filter(Boolean) as { Icon: typeof Camera; text: string; href: string }[];

  return (
    <>
      <AdminPageTitle
        title="Dashboard"
        description={`Today, ${formatDate(today)} · ${inHouse} reservation${inHouse === 1 ? "" : "s"} checked in`}
      />

      <ul className="admin-stagger grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className={`block h-full rounded-lg border p-5 transition duration-300 hover:-translate-y-0.5 hover:border-forest-300 hover:shadow-[0_12px_28px_-14px_rgb(14_26_49/0.3)] ${s.highlight ? "border-clay-300 bg-clay-50" : "border-cream-200 bg-white"}`}
            >
              <p className="text-sm text-muted">{s.label}</p>
              <p className="mt-1 font-display text-3xl font-semibold text-forest-900">{s.value}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {[
          { title: "Arriving today", rows: arrivals, empty: "No check-ins today." },
          { title: "Departing today", rows: departures, empty: "No check-outs today." },
        ].map((block) => (
          <Panel key={block.title} title={block.title}>
            {block.rows.length === 0 ? (
              <p className="text-sm text-muted">{block.empty}</p>
            ) : (
              <ul className="divide-y divide-cream-100">
                {block.rows.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/reservations/${r.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream-50">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-forest-900">{r.guestName}</p>
                        <p className="text-xs text-muted">{r.assignments.length ? r.assignments.map((a) => a.roomUnit.name).join(", ") : `${r.numberOfRooms} × ${r.roomType} — no room assigned`}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}

        <Panel title="Rooms tonight" className="lg:col-span-2">
          <ul className="grid gap-3 sm:grid-cols-2">
            {tonight.map((c) => (
              <li key={c.roomId} className="flex flex-col gap-1.5 rounded-md bg-cream-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-forest-900">{c.name}</span>
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  {c.booked} booked · {c.available} of {c.total} available <StatusBadge status={c.status} />
                </span>
              </li>
            ))}
          </ul>
          <Link href="/admin/availability" className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-clay-700">
            Open availability board <ArrowRight size={14} aria-hidden />
          </Link>
        </Panel>

        <Panel title="Recent reservations" className="lg:col-span-2">
          {recentReservations.length === 0 ? (
            <EmptyState title="No reservations yet" description="Use “New Reservation” for walk-in, phone or WhatsApp bookings, or convert a website inquiry." />
          ) : (
            <ul className="divide-y divide-cream-100">
              {recentReservations.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/reservations/${r.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream-50">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-forest-900">{r.guestName}</p>
                      <p className="text-xs text-muted">
                        {r.roomType} · {formatDate(r.checkIn)} → {formatDate(r.checkOut)} · {statusLabel(r.source)}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Recent booking inquiries">
          {recentInquiries.length === 0 ? (
            <EmptyState title="No inquiries yet" description="New booking inquiries from the website will appear here." />
          ) : (
            <ul className="divide-y divide-cream-100">
              {recentInquiries.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream-50">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-forest-900">{b.name}</p>
                      <p className="text-xs text-muted">
                        {b.roomType} · {formatDate(b.checkIn)} → {formatDate(b.checkOut)}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/bookings" className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-clay-700">
            All inquiries <ArrowRight size={14} aria-hidden />
          </Link>
        </Panel>

        <Panel title="Recent contact messages">
          {recentMessages.length === 0 ? (
            <EmptyState title="No messages yet" description="Messages sent from the Contact page will appear here." />
          ) : (
            <ul className="divide-y divide-cream-100">
              {recentMessages.map((m) => (
                <li key={m.id}>
                  <Link href={`/admin/messages/${m.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream-50">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-forest-900">{m.name}</p>
                      <p className="truncate text-xs text-muted">
                        {formatDateTime(m.createdAt)} · {m.message}
                      </p>
                    </div>
                    <StatusBadge status={m.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/messages" className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-clay-700">
            All messages <ArrowRight size={14} aria-hidden />
          </Link>
        </Panel>
      </div>

      {todos.length > 0 && (
        <Panel title="Still to do" description="Things that will make your website more complete." className="mt-6">
          <ul className="space-y-2">
            {todos.map(({ Icon, text, href }) => (
              <li key={text}>
                <Link href={href} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-cream-50">
                  <Icon size={18} className="shrink-0 text-clay-600" aria-hidden />
                  <span className="flex-1">{text}</span>
                  <ArrowRight size={14} className="text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
