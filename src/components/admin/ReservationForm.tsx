"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { createReservation, updateReservation, checkRoomAvailability, type UnitAvailability } from "@/server/actions/admin/reservations";
import { AdminForm, SubmitButton, useFieldErrors } from "./AdminForm";
import { ASelect, AText, ATextArea } from "./Fields";
import { Panel } from "./ui";
import { cn, formatPrice } from "@/lib/utils/format";

export type ReservationDefaults = {
  guestName: string;
  phone: string;
  email: string;
  country: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  roomId: string;
  numberOfRooms: number;
  unitIds: string[];
  source: string;
  status: string;
  paymentStatus: string;
  amount: number | null;
  adminNotes: string;
};

type RoomOption = { id: string; name: string; price: number; currency: string };

const SOURCES = [
  ["WALK_IN", "Walk-in"],
  ["PHONE", "Phone"],
  ["WHATSAPP", "WhatsApp"],
  ["WEBSITE", "Website"],
  ["OTHER", "Other"],
];
const STATUSES = [
  ["CONFIRMED", "Confirmed"],
  ["PENDING", "Pending (room held)"],
  ["CHECKED_IN", "Checked in"],
  ["CHECKED_OUT", "Checked out"],
  ["INQUIRY", "Inquiry (no room held)"],
  ["CANCELLED", "Cancelled"],
  ["NO_SHOW", "No-show"],
];
const PAYMENTS = [
  ["UNPAID", "Unpaid"],
  ["PARTIAL", "Partly paid"],
  ["PAID", "Paid"],
  ["REFUNDED", "Refunded"],
];

function nights(a: string, b: string) {
  if (!a || !b || b <= a) return 0;
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function ReservationForm({
  rooms,
  defaults,
  reservationId,
  inquiryId,
}: {
  rooms: RoomOption[];
  defaults: ReservationDefaults;
  reservationId?: string;
  inquiryId?: string;
}) {
  return (
    <AdminForm action={reservationId ? updateReservation : createReservation} className="space-y-6">
      {reservationId && <input type="hidden" name="id" value={reservationId} />}
      {inquiryId && <input type="hidden" name="inquiryId" value={inquiryId} />}
      <Fields rooms={rooms} d={defaults} reservationId={reservationId} />
      <div className="sticky bottom-4 flex justify-end">
        <SubmitButton className="shadow-lg">{reservationId ? "Save reservation" : "Create reservation"}</SubmitButton>
      </div>
    </AdminForm>
  );
}

function Fields({ rooms, d, reservationId }: { rooms: RoomOption[]; d: ReservationDefaults; reservationId?: string }) {
  const errors = useFieldErrors();
  const [roomId, setRoomId] = useState(d.roomId || rooms[0]?.id || "");
  const [checkIn, setCheckIn] = useState(d.checkIn);
  const [checkOut, setCheckOut] = useState(d.checkOut);
  const [numberOfRooms, setNumberOfRooms] = useState(d.numberOfRooms);
  const [unitIds, setUnitIds] = useState<string[]>(d.unitIds);
  const [amount, setAmount] = useState(d.amount?.toString() ?? "");
  const [avail, setAvail] = useState<{ key: string; data: UnitAvailability | null } | null>(null);

  const key = `${roomId}|${checkIn}|${checkOut}`;
  const ready = Boolean(roomId && checkIn && checkOut && checkOut > checkIn);
  const loading = ready && avail?.key !== key;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const t = setTimeout(() => {
      checkRoomAvailability(roomId, checkIn, checkOut, reservationId).then((data) => {
        if (!cancelled) setAvail({ key, data });
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [ready, key, roomId, checkIn, checkOut, reservationId]);

  const room = rooms.find((r) => r.id === roomId);
  const n = nights(checkIn, checkOut);
  const data = avail?.key === key ? avail.data : null;

  return (
    <>
      <Panel title="Stay">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <AText label="Check-in" name="checkIn" type="date" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          <AText
            label="Check-out"
            name="checkOut"
            type="date"
            required
            min={checkIn || undefined}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            hint={n > 0 ? `${n} night${n === 1 ? "" : "s"}` : undefined}
          />
          <ASelect
            label="Room type"
            name="roomId"
            required
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              setUnitIds([]);
            }}
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {formatPrice(r.price, r.currency)} / room
              </option>
            ))}
          </ASelect>
          <AText
            label="Number of rooms"
            name="numberOfRooms"
            type="number"
            min={1}
            max={8}
            required
            value={numberOfRooms}
            onChange={(e) => setNumberOfRooms(Math.max(1, Number(e.target.value) || 1))}
          />
          <AText label="Guests" name="guests" type="number" min={1} max={50} required defaultValue={d.guests} hint="For information only." />
        </div>
      </Panel>

      <Panel title="Assign rooms" description="Pick the physical room(s). You can leave this until the guest arrives — the room type is still held.">
        {!ready ? (
          <p className="text-sm text-muted">Choose check-in and check-out dates to see which rooms are free.</p>
        ) : loading ? (
          <p className="flex items-center gap-2 text-sm text-muted" role="status">
            <Loader2 size={16} className="animate-spin" aria-hidden /> Checking availability…
          </p>
        ) : !data ? (
          <p className="text-sm text-red-700">Couldn&apos;t check availability for these dates.</p>
        ) : (
          <>
            <p
              className={cn(
                "mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                data.categoryAvailable >= numberOfRooms ? "bg-forest-50 text-forest-800" : "bg-red-50 text-red-800",
              )}
              role="status"
            >
              {data.categoryAvailable >= numberOfRooms ? <CheckCircle2 size={16} aria-hidden /> : <AlertTriangle size={16} aria-hidden />}
              {data.categoryAvailable} of {data.categoryTotal} {room ? `${room.name}${data.categoryTotal === 1 ? "" : "s"}` : "rooms"} free for every night of these dates
              {data.categoryAvailable < numberOfRooms && ` — not enough for ${numberOfRooms}`}
            </p>
            <fieldset>
              <legend className="sr-only">Physical rooms</legend>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.units.map((u) => {
                  const checked = unitIds.includes(u.id);
                  const blocked = !u.active || Boolean(u.busyWith);
                  return (
                    <li key={u.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
                          checked ? "border-forest-600 bg-forest-50" : "border-cream-300 bg-white",
                          blocked && !checked && "cursor-not-allowed opacity-60",
                          blocked && checked && "border-red-400 bg-red-50",
                        )}
                      >
                        <input
                          type="checkbox"
                          name="unitIds"
                          value={u.id}
                          checked={checked}
                          disabled={blocked && !checked}
                          onChange={(e) => setUnitIds((prev) => (e.target.checked ? [...prev, u.id] : prev.filter((x) => x !== u.id)))}
                          className="h-4 w-4 accent-forest-700"
                        />
                        <span className="flex-1">
                          <span className="font-semibold text-ink">{u.name}</span>
                          <span className={cn("block text-xs", u.busyWith || !u.active ? "text-red-700" : "text-forest-700")}>
                            {!u.active ? "Out of service" : u.busyWith ? `Booked — ${u.busyWith}` : "Free"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
            {unitIds.length > numberOfRooms && <p className="field-error">You selected more rooms than “Number of rooms”.</p>}
          </>
        )}
        {errors.unitIds && (
          <p className="field-error" role="alert">
            {errors.unitIds[0]}
          </p>
        )}
        {errors.numberOfRooms && (
          <p className="field-error" role="alert">
            {errors.numberOfRooms[0]}
          </p>
        )}
      </Panel>

      <Panel title="Guest">
        <div className="grid gap-5 sm:grid-cols-2">
          <AText label="Guest name" name="guestName" required maxLength={100} defaultValue={d.guestName} autoComplete="off" />
          <AText label="Phone" name="phone" type="tel" required maxLength={25} defaultValue={d.phone} autoComplete="off" />
          <AText label="Email" name="email" type="email" optional maxLength={254} defaultValue={d.email} autoComplete="off" />
          <AText label="Country / nationality" name="country" optional maxLength={80} defaultValue={d.country} autoComplete="off" />
        </div>
      </Panel>

      <Panel title="Booking & payment">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <ASelect label="Source" name="source" defaultValue={d.source}>
            {SOURCES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </ASelect>
          <ASelect label="Status" name="status" defaultValue={d.status} hint="Confirmed, pending, checked-in and checked-out reservations hold rooms.">
            {STATUSES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </ASelect>
          <ASelect label="Payment" name="paymentStatus" defaultValue={d.paymentStatus}>
            {PAYMENTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </ASelect>
          <div>
            <AText
              label={`Amount (${room?.currency ?? "NPR"})`}
              name="amount"
              type="number"
              min={0}
              optional
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {room && n > 0 && (
              <button
                type="button"
                className="mt-1 inline-flex min-h-8 items-center text-xs font-semibold text-clay-700 underline"
                onClick={() => setAmount(String(room.price * numberOfRooms * n))}
              >
                Use {formatPrice(room.price * numberOfRooms * n, room.currency)} ({numberOfRooms} room × {n} night{n === 1 ? "" : "s"})
              </button>
            )}
          </div>
          <ATextArea label="Internal notes" name="adminNotes" defaultValue={d.adminNotes} rows={3} maxLength={5000} optional className="sm:col-span-2 lg:col-span-4" />
        </div>
      </Panel>
    </>
  );
}
