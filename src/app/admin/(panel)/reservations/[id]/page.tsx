import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, LogIn, LogOut, Mail, Phone, UserX, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { toDateStr } from "@/lib/availability";
import { formatDate, formatDateTime, mailtoHref, nightsBetween, telHref, todayInNepal, whatsappHref } from "@/lib/utils/format";
import { deleteReservation, setReservationStatus } from "@/server/actions/admin/reservations";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ReservationForm } from "@/components/admin/ReservationForm";
import { AdminPageTitle, Panel, StatusBadge, statusLabel } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/shared/icons";

// Static title: guest names are never placed in page metadata.
export const metadata = { title: "Reservation" };

function QuickAction({ id, status, label, icon, variant = "outline" }: { id: string; status: string; label: string; icon: React.ReactNode; variant?: "primary" | "outline" }) {
  return (
    <AdminForm action={setReservationStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={variant}>
        {icon}
        {label}
      </SubmitButton>
    </AdminForm>
  );
}

export default async function ReservationPage({ params, searchParams }: PageProps<"/admin/reservations/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [r, rooms] = await Promise.all([
    prisma.reservation.findUnique({
      where: { id },
      include: { assignments: { include: { roomUnit: { select: { id: true, name: true } } } }, inquiry: { select: { id: true, createdAt: true } } },
    }),
    prisma.room.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, price: true, currency: true } }),
  ]);
  if (!r) notFound();

  const today = todayInNepal();
  const checkIn = toDateStr(r.checkIn);
  const checkOut = toDateStr(r.checkOut);
  const assigned = r.assignments.map((a) => a.roomUnit.name);
  const canCheckIn = ["PENDING", "CONFIRMED"].includes(r.status) && today >= checkIn;
  const waText = `Hello ${r.guestName}, this is Lama Hotel & Lodge about your stay ${formatDate(r.checkIn)} – ${formatDate(r.checkOut)}.`;

  return (
    <>
      <Link href="/admin/reservations" className="inline-flex min-h-10 items-center text-sm font-semibold text-clay-700">
        ← Reservations
      </Link>
      <AdminPageTitle
        title={r.guestName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            <StatusBadge status={r.paymentStatus} />
            <span>
              {formatDate(r.checkIn)} → {formatDate(r.checkOut)} · {nightsBetween(r.checkIn, r.checkOut)} nights · {r.numberOfRooms} × {r.roomType} ·{" "}
              {assigned.length ? assigned.join(", ") : <strong className="text-clay-700">no room assigned yet</strong>}
            </span>
          </span>
        }
      />
      {sp.created && <p className="mb-6 rounded-xl bg-forest-50 px-4 py-3 text-sm font-medium text-forest-900">Reservation created. Availability has been updated.</p>}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Quick actions" className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {["PENDING", "INQUIRY"].includes(r.status) && <QuickAction id={r.id} status="CONFIRMED" label="Confirm" icon={<CheckCircle2 size={16} aria-hidden />} variant="primary" />}
            {canCheckIn && <QuickAction id={r.id} status="CHECKED_IN" label="Check in" icon={<LogIn size={16} aria-hidden />} variant="primary" />}
            {r.status === "CHECKED_IN" && <QuickAction id={r.id} status="CHECKED_OUT" label="Check out" icon={<LogOut size={16} aria-hidden />} variant="primary" />}
            {["PENDING", "CONFIRMED"].includes(r.status) && today >= checkIn && <QuickAction id={r.id} status="NO_SHOW" label="No-show" icon={<UserX size={16} aria-hidden />} />}
            {["INQUIRY", "PENDING", "CONFIRMED"].includes(r.status) && <QuickAction id={r.id} status="CANCELLED" label="Cancel reservation" icon={<Ban size={16} aria-hidden />} />}
            {["CANCELLED", "NO_SHOW"].includes(r.status) && <QuickAction id={r.id} status="CONFIRMED" label="Re-activate" icon={<CheckCircle2 size={16} aria-hidden />} />}
          </div>
          <p className="mt-3 text-xs text-muted">
            {canCheckIn && assigned.length < r.numberOfRooms ? "Check in assigns a free room automatically if none is assigned yet. " : ""}
            Checking out early frees the remaining nights. Cancelled and no-show reservations don&apos;t hold rooms.
          </p>
        </Panel>
        <Panel title="Contact guest">
          <div className="space-y-2 text-sm">
            <a href={telHref(r.phone)} className="flex items-center gap-2 rounded-lg border border-cream-200 px-3 py-2.5 hover:bg-cream-50">
              <Phone size={16} aria-hidden /> {r.phone}
            </a>
            <a href={whatsappHref(r.phone, waText)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-cream-200 px-3 py-2.5 hover:bg-cream-50">
              <WhatsAppIcon size={16} /> WhatsApp
            </a>
            {r.email && (
              <a href={mailtoHref(r.email, "Your stay at Lama Hotel & Lodge")} className="flex items-center gap-2 rounded-lg border border-cream-200 px-3 py-2.5 break-all hover:bg-cream-50">
                <Mail size={16} className="shrink-0" aria-hidden /> {r.email}
              </a>
            )}
          </div>
          <p className="mt-4 text-xs text-muted">
            Source: {statusLabel(r.source)} · Created {formatDateTime(r.createdAt)}
            {r.inquiry && (
              <>
                {" · "}
                <Link href={`/admin/bookings/${r.inquiry.id}`} className="underline">
                  From website inquiry
                </Link>
              </>
            )}
          </p>
        </Panel>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-forest-900">Edit reservation</h2>
      {/* Keyed by updatedAt: after a quick action (e.g. Check in) the form reloads with the new
          status, so saving it can never silently revert the change. */}
      <ReservationForm
        key={r.updatedAt.toISOString()}
        rooms={rooms}
        reservationId={r.id}
        defaults={{
          guestName: r.guestName,
          phone: r.phone,
          email: r.email,
          country: r.country,
          checkIn,
          checkOut,
          guests: r.guests,
          roomId: r.roomId,
          numberOfRooms: r.numberOfRooms,
          unitIds: r.assignments.map((a) => a.roomUnit.id),
          source: r.source,
          status: r.status,
          paymentStatus: r.paymentStatus,
          amount: r.amount,
          adminNotes: r.adminNotes,
        }}
      />

      <Panel title="Delete reservation" className="mt-8 border-red-100">
        <p className="mb-4 text-sm text-muted">Use “Cancel reservation” to keep a record. Delete only mistakes.</p>
        <ConfirmDialog action={deleteReservation} fields={{ id: r.id }} title="Delete this reservation?" description="This permanently deletes the reservation and frees its rooms." triggerLabel="Delete reservation" />
      </Panel>
    </>
  );
}
