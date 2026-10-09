import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CalendarRange, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { OCCUPYING_STATUSES, toDate } from "@/lib/availability";
import { cn, formatDate, formatPrice, nightsBetween, todayInNepal } from "@/lib/utils/format";
import { AdminPageTitle, DataTable, EmptyState, StatusBadge, statusLabel } from "@/components/admin/ui";

export const metadata = { title: "Reservations" };

const FILTERS = {
  upcoming: "Upcoming & in-house",
  arrivals: "Arriving today",
  departures: "Departing today",
  inhouse: "In house",
  pending: "Pending",
  past: "Past",
  cancelled: "Cancelled / no-show",
  all: "All",
} as const;
type Filter = keyof typeof FILTERS;

const CLEAR_BTN = "absolute top-1/2 right-3 -translate-y-1/2 p-1 text-gray-700 peer-placeholder-shown:hidden";

function ClearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default async function ReservationsPage({ searchParams }: PageProps<"/admin/reservations">) {
  const sp = await searchParams;
  const filter: Filter = typeof sp.view === "string" && sp.view in FILTERS ? (sp.view as Filter) : "upcoming";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const today = toDate(todayInNepal());

  const byFilter: Record<Filter, Prisma.ReservationWhereInput> = {
    upcoming: { status: { in: [...OCCUPYING_STATUSES].filter((s) => s !== "CHECKED_OUT") }, checkOut: { gte: today } },
    arrivals: { checkIn: today, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] } },
    departures: { checkOut: today, status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] } },
    inhouse: { status: "CHECKED_IN" },
    pending: { status: { in: ["PENDING", "INQUIRY"] } },
    past: { checkOut: { lt: today } },
    cancelled: { status: { in: ["CANCELLED", "NO_SHOW"] } },
    all: {},
  };
  const where: Prisma.ReservationWhereInput = {
    ...byFilter[filter],
    ...(q ? { OR: [{ guestName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
  };

  const rows = await prisma.reservation.findMany({
    where,
    orderBy: filter === "past" || filter === "all" ? { checkIn: "desc" } : { checkIn: "asc" },
    take: 300,
    select: {
      id: true,
      guestName: true,
      phone: true,
      checkIn: true,
      checkOut: true,
      roomType: true,
      numberOfRooms: true,
      status: true,
      paymentStatus: true,
      amount: true,
      currency: true,
      source: true,
      assignments: { select: { roomUnit: { select: { name: true } } } },
    },
  });

  return (
    <>
      <AdminPageTitle
        title="Reservations"
        description="Bookings from walk-ins, phone, WhatsApp and converted website inquiries."
        actions={
          // "New Reservation" lives in the admin header on every page; avoid duplicating it here.
          <Link href="/admin/availability" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-cream-300 bg-white px-4 text-sm font-semibold hover:bg-cream-100">
            <CalendarRange size={17} aria-hidden /> Availability
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filter reservations" className="relative flex gap-1 overflow-x-auto pb-1">
          {(Object.keys(FILTERS) as Filter[]).map((f) => (
            <Link
              key={f}
              href={`/admin/reservations?view=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={filter === f ? "page" : undefined}
              className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium", filter === f ? "bg-forest-800 text-white" : "bg-white text-ink hover:bg-cream-100")}
            >
              {FILTERS[f]}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" role="search">
          <input type="hidden" name="view" value={filter} />
          <label htmlFor="q" className="sr-only">
            Search reservations
          </label>
          <div className="relative">
            <input id="q" name="q" defaultValue={q} placeholder="Search name, phone, email" className="peer field-input !py-2 pr-10" />
            {/* Clear: hidden while empty. With an active search, reset would restore `q`, so link back to the unfiltered list instead. */}
            {q ? (
              <Link href={`/admin/reservations?view=${filter}`} aria-label="Clear search" className={CLEAR_BTN}>
                <ClearIcon />
              </Link>
            ) : (
              <button type="reset" aria-label="Clear search" className={CLEAR_BTN}>
                <ClearIcon />
              </button>
            )}
          </div>
          <button type="submit" className="rounded-lg bg-forest-800 px-4 text-sm font-semibold text-white">
            Search
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No reservations here"
          description="Use “New Reservation” for walk-in, phone or WhatsApp bookings."
          action={
            <Link href="/admin/reservations/new" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-clay-600 px-4 text-sm font-semibold text-white">
              <Plus size={16} aria-hidden /> New Reservation
            </Link>
          }
        />
      ) : (
        <DataTable
          caption="Reservations"
          rows={rows}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/reservations/${r.id}`}
          columns={[
            { header: "Guest", cell: (r) => r.guestName },
            { header: "Dates", cell: (r) => `${formatDate(r.checkIn)} → ${formatDate(r.checkOut)} (${nightsBetween(r.checkIn, r.checkOut)}n)` },
            {
              header: "Room",
              cell: (r) =>
                r.assignments.length ? r.assignments.map((a) => a.roomUnit.name).join(", ") : <span className="text-clay-700">{`${r.numberOfRooms} × ${r.roomType} — unassigned`}</span>,
            },
            { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            { header: "Payment", cell: (r) => <span className="text-sm">{statusLabel(r.paymentStatus)}{r.amount != null ? ` · ${formatPrice(r.amount, r.currency)}` : ""}</span> },
            { header: "Source", cell: (r) => <span className="text-muted">{statusLabel(r.source)}</span> },
          ]}
        />
      )}
    </>
  );
}
