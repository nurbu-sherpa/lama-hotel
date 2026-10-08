import Link from "next/link";
import { Inbox } from "lucide-react";
import { prisma } from "@/lib/db";
import { addDays, isDateStr, toDateStr } from "@/lib/availability";
import { todayInNepal } from "@/lib/utils/format";
import { AdminPageTitle } from "@/components/admin/ui";
import { ReservationForm, type ReservationDefaults } from "@/components/admin/ReservationForm";

export const metadata = { title: "New reservation" };

const UUID = /^[0-9a-f-]{36}$/;

export default async function NewReservationPage({ searchParams }: PageProps<"/admin/reservations/new">) {
  const sp = await searchParams;
  const rooms = await prisma.room.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, price: true, currency: true } });
  const today = todayInNepal();

  const date = typeof sp.date === "string" && isDateStr(sp.date) ? sp.date : today;
  const unitId = typeof sp.unit === "string" && UUID.test(sp.unit) ? sp.unit : null;
  const unit = unitId ? await prisma.roomUnit.findUnique({ where: { id: unitId }, select: { id: true, roomId: true } }) : null;

  // Converting a website inquiry: prefill from it (the inquiry itself is never modified except its status).
  const inquiryId = typeof sp.inquiry === "string" && UUID.test(sp.inquiry) ? sp.inquiry : null;
  const inquiry = inquiryId ? await prisma.bookingInquiry.findUnique({ where: { id: inquiryId } }) : null;

  const defaults: ReservationDefaults = inquiry
    ? {
        guestName: inquiry.name,
        phone: inquiry.phone,
        email: inquiry.email,
        country: inquiry.country,
        checkIn: toDateStr(inquiry.checkIn),
        checkOut: toDateStr(inquiry.checkOut),
        guests: inquiry.guests,
        roomId: inquiry.roomId ?? rooms[0]?.id ?? "",
        numberOfRooms: inquiry.numberOfRooms,
        unitIds: [],
        source: "WEBSITE",
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        amount: null,
        adminNotes: [inquiry.arrivalInfo && `Arrival: ${inquiry.arrivalInfo}`, inquiry.message && `Guest message: ${inquiry.message}`].filter(Boolean).join("\n"),
      }
    : {
        guestName: "",
        phone: "",
        email: "",
        country: "Nepal",
        checkIn: date,
        checkOut: addDays(date, 1),
        guests: 2,
        roomId: unit?.roomId ?? rooms[0]?.id ?? "",
        numberOfRooms: 1,
        unitIds: unit ? [unit.id] : [],
        source: "WALK_IN",
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        amount: null,
        adminNotes: "",
      };

  return (
    <>
      <Link href="/admin/reservations" className="inline-flex min-h-10 items-center text-sm font-semibold text-clay-700">
        ← Reservations
      </Link>
      <AdminPageTitle
        title={inquiry ? "Convert inquiry to reservation" : "New reservation"}
        description={inquiry ? undefined : "For walk-in guests, phone calls, WhatsApp messages and other offline bookings. A confirmed reservation blocks the room immediately."}
      />
      {inquiry && (
        <p className="mb-6 flex gap-3 rounded-xl border border-forest-100 bg-forest-50 px-4 py-3 text-sm text-forest-900">
          <Inbox size={18} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Details copied from the website inquiry by <strong>{inquiry.name}</strong>. The original inquiry is kept unchanged and linked to this reservation.{" "}
            <Link href={`/admin/bookings/${inquiry.id}`} className="underline">
              View inquiry
            </Link>
          </span>
        </p>
      )}
      {rooms.length === 0 ? (
        <p className="text-muted">Add a room type first (Rooms → Add room type).</p>
      ) : (
        <ReservationForm rooms={rooms} defaults={defaults} inquiryId={inquiry?.id} />
      )}
    </>
  );
}
