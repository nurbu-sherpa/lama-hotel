import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, CalendarPlus, Mail, Phone } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatPrice, mailtoHref, nightsBetween, telHref, whatsappHref } from "@/lib/utils/format";
import { deleteBookingInquiry, toggleArchiveBooking, updateBookingInquiry } from "@/server/actions/admin/inbox";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { ASelect, ATextArea } from "@/components/admin/Fields";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AdminPageTitle, Panel, StatusBadge } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/shared/icons";

export const metadata = { title: "Booking inquiry" };

export default async function BookingDetailPage({ params }: PageProps<"/admin/bookings/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const b = await prisma.bookingInquiry.findUnique({
    where: { id },
    include: { reservations: { orderBy: { createdAt: "asc" }, select: { id: true, status: true, checkIn: true, checkOut: true, roomType: true } } },
  });
  if (!b) notFound();
  const nights = nightsBetween(b.checkIn, b.checkOut);
  const waText = `Hello ${b.name}, thank you for your inquiry to Lama Hotel & Lodge for ${formatDate(b.checkIn)} – ${formatDate(b.checkOut)}.`;

  const details: [string, React.ReactNode][] = [
    ["Check-in", formatDate(b.checkIn)],
    ["Check-out", formatDate(b.checkOut)],
    ["Nights", nights],
    ["Room type", b.roomType],
    ["Number of rooms", b.numberOfRooms],
    ["Guests", `${b.guests} (for information)`],
    [
      "Advertised price at inquiry",
      b.requestedRoomPrice != null ? `${formatPrice(b.requestedRoomPrice, b.currency)} / room — not a confirmed price` : "—",
    ],
    ["Country", b.country],
    ["Arrival info", b.arrivalInfo || "—"],
    ["Received", formatDateTime(b.createdAt)],
  ];

  return (
    <>
      <Link href="/admin/bookings" className="inline-flex min-h-10 items-center text-sm font-semibold text-clay-700">
        ← All inquiries
      </Link>
      <AdminPageTitle
        title={b.name}
        description={
          <span className="flex items-center gap-2">
            <StatusBadge status={b.status} /> {b.archived && <span className="text-xs">Archived</span>}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Request">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {details.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium break-words text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {b.message && (
              <div className="mt-5 border-t border-cream-100 pt-4">
                <p className="text-sm text-muted">Message</p>
                <p className="mt-1 text-sm whitespace-pre-wrap text-ink">{b.message}</p>
              </div>
            )}
          </Panel>

          <Panel title="Status & internal notes" description="Notes are private — guests never see them.">
            <AdminForm action={updateBookingInquiry} className="space-y-4">
              <input type="hidden" name="id" value={b.id} />
              <ASelect label="Status" name="status" defaultValue={b.status}>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </ASelect>
              <ATextArea label="Internal notes" name="adminNotes" defaultValue={b.adminNotes} rows={5} maxLength={5000} placeholder="e.g. Called on 5 Oct, confirmed 2 Standard Rooms at NPR 1,200 each." />
              <div className="flex justify-end">
                <SubmitButton>Save</SubmitButton>
              </div>
            </AdminForm>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Contact guest">
            <div className="space-y-2 text-sm">
              <a href={telHref(b.phone)} className="flex items-center gap-2 rounded-lg border border-cream-200 px-3 py-2.5 hover:bg-cream-50">
                <Phone size={16} aria-hidden /> {b.phone}
              </a>
              <a href={whatsappHref(b.phone, waText)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-cream-200 px-3 py-2.5 hover:bg-cream-50">
                <WhatsAppIcon size={16} /> WhatsApp
              </a>
              <a href={mailtoHref(b.email, "Your inquiry — Lama Hotel & Lodge")} className="flex items-center gap-2 rounded-lg border border-cream-200 px-3 py-2.5 break-all hover:bg-cream-50">
                <Mail size={16} className="shrink-0" aria-hidden /> {b.email}
              </a>
            </div>
          </Panel>

          <Panel title="Reservation">
            {b.reservations.length > 0 ? (
              <ul className="mb-4 space-y-2 text-sm">
                {b.reservations.map((res) => (
                  <li key={res.id}>
                    <Link href={`/admin/reservations/${res.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-cream-200 px-3 py-2 hover:bg-cream-50">
                      <span>
                        {res.roomType} · {formatDate(res.checkIn)} → {formatDate(res.checkOut)}
                      </span>
                      <StatusBadge status={res.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-muted">This inquiry doesn&apos;t hold a room. Convert it to a reservation to book a room.</p>
            )}
            <Link
              href={`/admin/reservations/new?inquiry=${b.id}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-clay-600 px-4 text-sm font-semibold text-white hover:bg-clay-700"
            >
              <CalendarPlus size={16} aria-hidden /> {b.reservations.length ? "Create another reservation" : "Convert to reservation"}
            </Link>
            {b.reservations.length > 0 && (
              <p className="mt-3 text-xs text-muted">
                Extending the stay or adding rooms? Open the reservation above and change its Check-out or Number of rooms — don&apos;t create a second one.
              </p>
            )}
          </Panel>

          <Panel title="Manage">
            <div className="flex flex-wrap gap-2">
              <AdminForm action={toggleArchiveBooking}>
                <input type="hidden" name="id" value={b.id} />
                <SubmitButton variant="outline">
                  {b.archived ? <ArchiveRestore size={16} aria-hidden /> : <Archive size={16} aria-hidden />}
                  {b.archived ? "Restore" : "Archive"}
                </SubmitButton>
              </AdminForm>
              <ConfirmDialog action={deleteBookingInquiry} fields={{ id: b.id }} title="Delete this inquiry?" description="This permanently deletes the inquiry. Consider archiving instead." />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
