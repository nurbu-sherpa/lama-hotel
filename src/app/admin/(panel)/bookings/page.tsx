import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cn, formatDate, formatDateTime, nightsBetween } from "@/lib/utils/format";
import { AdminPageTitle, DataTable, EmptyState, StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "Booking Inquiries" };

const FILTERS = ["OPEN", "NEW", "CONTACTED", "CONFIRMED", "CANCELLED", "COMPLETED", "ARCHIVED", "ALL"] as const;
const LABELS: Record<(typeof FILTERS)[number], string> = {
  OPEN: "Open",
  NEW: "New",
  CONTACTED: "Contacted",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
  ALL: "All",
};

export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const sp = await searchParams;
  const filter = (FILTERS as readonly string[]).includes(String(sp.status)) ? (sp.status as (typeof FILTERS)[number]) : "OPEN";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";

  const where: Prisma.BookingInquiryWhereInput = {
    ...(filter === "OPEN" ? { archived: false, status: { in: ["NEW", "CONTACTED", "CONFIRMED"] } } : {}),
    ...(filter === "ARCHIVED" ? { archived: true } : {}),
    ...(["NEW", "CONTACTED", "CONFIRMED", "CANCELLED", "COMPLETED"].includes(filter) ? { status: filter as Prisma.EnumBookingStatusFilter["equals"], archived: false } : {}),
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }
      : {}),
  };

  const rows = await prisma.bookingInquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, name: true, phone: true, roomType: true, numberOfRooms: true, guests: true, checkIn: true, checkOut: true, status: true, createdAt: true },
  });

  return (
    <>
      <AdminPageTitle title="Booking Inquiries" description="Inquiries are requests — contact the guest, then update the status. Guests never see your internal notes." />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filter inquiries" className="relative flex gap-1 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={`/admin/bookings?status=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={filter === f ? "page" : undefined}
              className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium", filter === f ? "bg-forest-800 text-white" : "bg-white text-ink hover:bg-cream-100")}
            >
              {LABELS[f]}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" role="search">
          <input type="hidden" name="status" value={filter} />
          <label htmlFor="q" className="sr-only">
            Search inquiries
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Search name, email, phone" className="field-input !py-2" />
          <button type="submit" className="rounded-lg bg-forest-800 px-4 text-sm font-semibold text-white">
            Search
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No inquiries here" description={filter === "OPEN" ? "New inquiries from the booking form will appear here." : "Try another filter."} />
      ) : (
        <DataTable
          caption="Booking inquiries"
          rows={rows}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/bookings/${r.id}`}
          columns={[
            { header: "Guest", cell: (r) => r.name },
            { header: "Dates", cell: (r) => `${formatDate(r.checkIn)} → ${formatDate(r.checkOut)} (${nightsBetween(r.checkIn, r.checkOut)}n)` },
            { header: "Room", cell: (r) => `${r.numberOfRooms} × ${r.roomType}` },
            { header: "Guests", cell: (r) => r.guests },
            { header: "Phone", cell: (r) => r.phone },
            { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            { header: "Received", cell: (r) => <span className="text-muted">{formatDateTime(r.createdAt)}</span> },
          ]}
        />
      )}
    </>
  );
}
