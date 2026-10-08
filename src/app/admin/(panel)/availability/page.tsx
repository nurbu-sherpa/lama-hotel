import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { MAX_RANGE_NIGHTS, addDays, computeCategoryAvailability, eachNight, isDateStr, loadCategories, loadOccupying, roomsUsed } from "@/lib/availability";
import { cn, formatDate, todayInNepal } from "@/lib/utils/format";
import { AdminPageTitle, Panel, StatusBadge, statusLabel } from "@/components/admin/ui";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { togglePublicAvailability } from "@/server/actions/admin/hotel";

export const metadata = { title: "Availability" };

const CELL: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-clay-100 text-clay-800",
  CHECKED_IN: "bg-forest-700 text-white",
  CHECKED_OUT: "bg-sky-100 text-sky-900",
};

function shortDate(d: string) {
  const date = new Date(`${d}T00:00:00Z`);
  return { dow: date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }), day: date.getUTCDate() };
}

export default async function AvailabilityPage({ searchParams }: PageProps<"/admin/availability">) {
  const sp = await searchParams;
  const today = todayInNepal();
  const from = typeof sp.from === "string" && isDateStr(sp.from) ? sp.from : today;
  let to = typeof sp.to === "string" && isDateStr(sp.to) && sp.to > from ? sp.to : addDays(from, 1);
  if (eachNight(from, to).length > MAX_RANGE_NIGHTS) to = addDays(from, MAX_RANGE_NIGHTS);
  const nights = eachNight(from, to);
  const single = nights.length === 1;

  const [categories, reservations, units, hotel] = await Promise.all([
    loadCategories(),
    loadOccupying(prisma, from, to),
    prisma.roomUnit.findMany({ orderBy: [{ room: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, active: true, roomId: true } }),
    prisma.hotelSettings.findUniqueOrThrow({ where: { id: "default" }, select: { showPublicAvailability: true } }),
  ]);
  const summary = computeCategoryAvailability(categories, reservations, from, to);

  // Which reservation occupies each room on each night.
  const occupant = (unitId: string, night: string) => reservations.find((r) => r.unitIds.includes(unitId) && r.checkIn <= night && night < r.checkOut);
  const unassigned = reservations.filter((r) => r.unitIds.length < roomsUsed(r));

  const quick = [
    { label: "Today", from: today, to: addDays(today, 1) },
    { label: "Tomorrow", from: addDays(today, 1), to: addDays(today, 2) },
    { label: "Next 7 days", from: today, to: addDays(today, 7) },
    { label: "Next 14 days", from: today, to: addDays(today, 14) },
    { label: "Next 30 days", from: today, to: addDays(today, 30) },
  ];

  return (
    <>
      <AdminPageTitle
        title="Availability"
        description="Calculated from reservations in the database. Confirmed, pending, checked-in and checked-out stays hold rooms; cancelled and no-show don't."
        actions={
          <Link href={`/admin/reservations/new?date=${from}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-clay-600 px-5 text-base font-semibold text-white hover:bg-clay-700">
            <Plus size={18} aria-hidden /> New Reservation
          </Link>
        }
      />

      <Panel className="mb-6">
        <form className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="from" className="field-label">
              From (first night)
            </label>
            <input id="from" name="from" type="date" defaultValue={from} className="field-input" required />
          </div>
          <div>
            <label htmlFor="to" className="field-label">
              Until (check-out date)
            </label>
            <input id="to" name="to" type="date" defaultValue={to} className="field-input" required />
          </div>
          <button type="submit" className="min-h-11 rounded-lg bg-forest-800 px-4 text-sm font-semibold text-white">
            Show
          </button>
          <div className="flex flex-wrap gap-1.5">
            {quick.map((qr) => (
              <Link
                key={qr.label}
                href={`/admin/availability?from=${qr.from}&to=${qr.to}`}
                className={cn("rounded-full px-3 py-1.5 text-sm", qr.from === from && qr.to === to ? "bg-forest-800 text-white" : "bg-cream-100 hover:bg-cream-200")}
              >
                {qr.label}
              </Link>
            ))}
          </div>
        </form>
        <p className="mt-3 text-sm text-muted">
          {single ? `Night of ${formatDate(from)}` : `${nights.length} nights: ${formatDate(from)} → check-out ${formatDate(to)}`}
        </p>
      </Panel>

      <Panel
        title="Public website"
        description={
          hotel.showPublicAvailability
            ? "The website shows how many rooms of each type are available (counts only — never guest details). Keep reservations up to date so this stays accurate."
            : "Hidden. Turn this on once you record all bookings here (including walk-in, phone and WhatsApp), so the counts on the website are accurate."
        }
        className="mb-6"
      >
        <AdminForm action={togglePublicAvailability}>
          <SubmitButton variant={hotel.showPublicAvailability ? "outline" : "primary"}>
            {hotel.showPublicAvailability ? "Hide availability on website" : "Show availability on website"}
          </SubmitButton>
        </AdminForm>
      </Panel>

      <h2 className="mb-3 text-lg font-semibold text-forest-900">By room type {single ? "" : "(rooms free for every night)"}</h2>
      <ul className="mb-8 grid gap-3 sm:grid-cols-2">
        {summary.map((c) => (
          <li key={c.roomId} className="rounded-lg border border-cream-200 bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-forest-900">{c.name}</p>
              <StatusBadge status={c.status} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ["Total", c.total],
                ["Booked", c.booked],
                ["Available", c.available],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-cream-50 py-2">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="font-display text-2xl font-semibold text-forest-900">{v}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 text-lg font-semibold text-forest-900">Rooms</h2>
      {single ? (
        <ul className="divide-y divide-cream-100 rounded-lg border border-cream-200 bg-white">
          {units.map((u) => {
            const r = occupant(u.id, from);
            return (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="w-32 shrink-0 font-semibold text-forest-900">{u.name}</span>
                {!u.active ? (
                  <span className="text-sm text-muted">Out of service</span>
                ) : r ? (
                  <Link href={`/admin/reservations/${r.id}`} className="flex flex-1 flex-wrap items-center gap-2 text-sm hover:underline">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", CELL[r.status])}>{statusLabel(r.status)}</span>
                    <span className="font-medium">{r.guestName}</span>
                    <span className="text-muted">
                      {formatDate(r.checkIn)} → {formatDate(r.checkOut)}
                    </span>
                  </Link>
                ) : (
                  <span className="flex flex-1 items-center justify-between gap-2">
                    <span className="rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-semibold text-forest-800">Available</span>
                    <Link href={`/admin/reservations/new?date=${from}&unit=${u.id}`} className="text-sm font-semibold text-clay-700 hover:underline">
                      Book this room
                    </Link>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="relative overflow-x-auto rounded-lg border border-cream-200 bg-white">
          <table className="w-full border-collapse text-xs">
            <caption className="sr-only">Room occupancy per night</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-sm">
                  Room
                </th>
                {nights.map((n) => {
                  const d = shortDate(n);
                  return (
                    <th key={n} scope="col" className={cn("min-w-11 px-1 py-2 text-center font-medium", n === today && "bg-clay-50 text-clay-700")}>
                      <span className="block text-[0.65rem] text-muted">{d.dow}</span>
                      {d.day}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="border-t border-cream-100">
                  <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-sm font-semibold whitespace-nowrap text-forest-900">
                    {u.name}
                  </th>
                  {nights.map((n) => {
                    if (!u.active) return <td key={n} className="bg-stone-100" title="Out of service" />;
                    const r = occupant(u.id, n);
                    return (
                      <td key={n} className="p-0.5">
                        {r ? (
                          <Link
                            href={`/admin/reservations/${r.id}`}
                            title={`${r.guestName} · ${formatDate(r.checkIn)} → ${formatDate(r.checkOut)} · ${statusLabel(r.status)}`}
                            className={cn("block truncate rounded px-1 py-1.5 text-center font-semibold", CELL[r.status])}
                          >
                            {r.checkIn === n || n === from ? r.guestName.split(" ")[0] : "•"}
                          </Link>
                        ) : (
                          <Link
                            href={`/admin/reservations/new?date=${n}&unit=${u.id}`}
                            title={`${u.name} free on ${formatDate(n)} — click to book`}
                            className="block rounded bg-forest-50 py-1.5 text-center text-forest-700 hover:bg-forest-100"
                          >
                            <span className="sr-only">Available</span>·
                          </Link>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        {Object.entries(CELL).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("inline-block h-3 w-3 rounded", c)} /> {statusLabel(s)}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-forest-50" /> Available
        </span>
      </p>

      {unassigned.length > 0 && (
        <Panel title="Reservations without a room assigned" description="These hold rooms in their room type but don't have a physical room yet." className="mt-8">
          <ul className="divide-y divide-cream-100">
            {unassigned.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/reservations/${r.id}`} className="flex flex-wrap items-center gap-3 py-2.5 text-sm hover:underline">
                  <span className="font-medium">{r.guestName}</span>
                  <span className="text-muted">
                    {formatDate(r.checkIn)} → {formatDate(r.checkOut)} · {roomsUsed(r) - r.unitIds.length} of {roomsUsed(r)} room(s) unassigned ·{" "}
                    {categories.find((c) => c.id === r.roomId)?.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
