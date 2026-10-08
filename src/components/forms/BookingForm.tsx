"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { checkPublicAvailability, submitBookingInquiry, type PublicFormState } from "@/server/actions/public";
import { Honeypot, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { ErrorSummary } from "@/components/ui/ErrorSummary";
import { Turnstile } from "./Turnstile";
import { formatPrice, whatsappHref } from "@/lib/utils/format";

type RoomOption = { slug: string; name: string; price: number; currency: string; priceSuffix: string; status: string; totalRooms: number };

const initial: PublicFormState = { status: "idle" };

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function BookingForm({ rooms, defaultRoom, today, whatsappNumber }: { rooms: RoomOption[]; defaultRoom?: string; today: string; whatsappNumber: string }) {
  const [state, action, pending] = useActionState(submitBookingInquiry, initial);
  const v = state.values ?? {};
  const e = state.errors ?? {};

  const [roomSlug, setRoomSlug] = useState(v.roomSlug || defaultRoom || rooms[0]?.slug || "");
  const [checkIn, setCheckIn] = useState(v.checkIn || "");
  const [checkOut, setCheckOut] = useState(v.checkOut || "");
  const selected = rooms.find((r) => r.slug === roomSlug);

  // Optional live availability (counts only) — shown only if the hotel has enabled it.
  type Avail = Awaited<ReturnType<typeof checkPublicAvailability>>;
  const [avail, setAvail] = useState<{ key: string; rows: Avail } | null>(null);
  const datesKey = `${checkIn}|${checkOut}`;
  const datesValid = Boolean(checkIn && checkOut && checkOut > checkIn && checkIn >= today);
  useEffect(() => {
    if (!datesValid) return;
    let cancelled = false;
    const t = setTimeout(() => {
      checkPublicAvailability(checkIn, checkOut).then((rows) => {
        if (!cancelled) setAvail({ key: datesKey, rows });
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [datesValid, datesKey, checkIn, checkOut]);
  const roomAvail = datesValid && avail?.key === datesKey ? avail.rows?.find((r) => r.slug === roomSlug) : undefined;

  const successRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
    if (state.status === "error") errorRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="card border-t-4 border-t-forest-600 p-8 text-center outline-none sm:p-12">
        <CheckCircle2 size={44} className="mx-auto text-forest-600" aria-hidden strokeWidth={1.6} />
        <h2 className="mt-4 font-display text-3xl font-medium text-forest-900">Thank you — inquiry received</h2>
        <p className="mx-auto mt-3 max-w-md text-lg text-ink/85">{state.message}</p>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Your room is not confirmed until we contact you. For a quicker reply, you can also message us on WhatsApp.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href={whatsappHref(whatsappNumber, state.whatsappText)} target="_blank" rel="noopener noreferrer" className="btn-dark">
            WhatsApp us
          </a>
          <Link href="/" className="btn-outline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="card relative space-y-8 p-5 sm:p-8"
      aria-describedby="booking-form-note"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (pending) return;
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <p id="booking-form-note" className="text-[0.95rem] text-muted">
        All fields are required unless marked <span className="font-medium text-ink">(optional)</span>.
      </p>

      {state.status === "error" && state.message && <ErrorSummary ref={errorRef} message={state.message} errors={e} labels={FIELD_LABELS} />}

      <fieldset className="space-y-5">
        <StepLegend n={1}>Your stay</StepLegend>

        <SelectField
          label="Room type"
          name="roomSlug"
          required
          value={roomSlug}
          onChange={(ev) => setRoomSlug(ev.target.value)}
          error={e.roomSlug}
        >
          {rooms.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name} — {formatPrice(r.price, r.currency)} {r.priceSuffix}
              {r.status === "UNAVAILABLE" ? " (currently unavailable)" : ""}
            </option>
          ))}
        </SelectField>

        {selected && (
          <div className="flex gap-3 border-l-2 border-forest-600 bg-forest-50 px-4 py-3 text-[0.95rem] text-forest-900">
            <Info size={18} className="mt-0.5 shrink-0" aria-hidden />
            <p>
              <strong className="font-semibold">
                {selected.name}: {formatPrice(selected.price, selected.currency)} {selected.priceSuffix}
              </strong>
              . The price is per room, not per person. The number of guests is for our information — we&apos;ll confirm the best arrangement with you.
            </p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Check-in date"
            name="checkIn"
            type="date"
            required
            min={today}
            value={checkIn}
            onChange={(ev) => setCheckIn(ev.target.value)}
            error={e.checkIn}
          />
          <TextField
            label="Check-out date"
            name="checkOut"
            type="date"
            required
            min={checkIn ? addDays(checkIn, 1) : addDays(today, 1)}
            value={checkOut}
            onChange={(ev) => setCheckOut(ev.target.value)}
            error={e.checkOut}
          />
          <TextField
            label="Number of guests"
            name="guests"
            type="number"
            inputMode="numeric"
            required
            min={1}
            max={50}
            defaultValue={v.guests || "2"}
            hint="Adults and children together."
            error={e.guests}
          />
          <TextField
            label="Number of rooms"
            name="numberOfRooms"
            type="number"
            inputMode="numeric"
            required
            min={1}
            max={8}
            defaultValue={v.numberOfRooms || "1"}
            hint="Each room has two 4 × 6 ft beds."
            error={e.numberOfRooms}
          />
        </div>
        {roomAvail && selected && (
          <p role="status" className="border-l-2 border-cream-300 bg-cream-100 px-4 py-3 text-[0.95rem] text-ink">
            {roomAvail.status === "FULLY_BOOKED"
              ? `${selected.name}s look fully booked for these dates. You can still send an inquiry — we'll suggest alternatives.`
              : `${roomAvail.available} ${selected.name}${roomAvail.available === 1 ? "" : "s"} currently free for these dates. We'll confirm availability with you.`}
          </p>
        )}
      </fieldset>

      <hr className="border-cream-200" />

      <fieldset className="space-y-5">
        <StepLegend n={2}>Your details</StepLegend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Full name" name="name" required maxLength={100} autoComplete="name" defaultValue={v.name} error={e.name} />
          <TextField label="Country" name="country" required maxLength={80} autoComplete="country-name" defaultValue={v.country} error={e.country} />
          <TextField label="Email" name="email" type="email" required maxLength={254} autoComplete="email" inputMode="email" defaultValue={v.email} error={e.email} />
          <TextField
            label="Phone / WhatsApp"
            name="phone"
            type="tel"
            required
            maxLength={25}
            autoComplete="tel"
            inputMode="tel"
            pattern="^\+?[0-9\s\-().]{7,25}$"
            placeholder="+977 98XXXXXXXX"
            hint="Include your country code so we can reach you."
            defaultValue={v.phone}
            error={e.phone}
          />
        </div>
      </fieldset>

      <hr className="border-cream-200" />

      <fieldset className="space-y-5">
        <StepLegend n={3}>Arrival &amp; message</StepLegend>
        <TextField
          label="Arrival information"
          name="arrivalInfo"
          optional
          maxLength={500}
          placeholder="e.g. Arriving by bus from Kathmandu around 6 PM"
          defaultValue={v.arrivalInfo}
          error={e.arrivalInfo}
        />
        <TextAreaField label="Message" name="message" optional maxLength={2000} placeholder="Anything else we should know?" defaultValue={v.message} error={e.message} />
      </fieldset>

      <Honeypot />
      <Turnstile resetKey={state} />

      <div className="space-y-4 border-t border-cream-200 pt-7">
        <button type="submit" className="btn-primary !min-h-12 w-full text-base sm:w-auto sm:!px-8" disabled={pending} aria-busy={pending}>
          {pending ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden /> Sending inquiry…
            </>
          ) : (
            "Send Booking Inquiry"
          )}
        </button>
        <p className="max-w-[60ch] text-[0.95rem] text-muted">
          Sending this form does not confirm your booking. We will contact you to confirm availability. No payment is taken online. See our{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </form>
  );
}

const FIELD_LABELS: Record<string, string> = {
  roomSlug: "Room type",
  checkIn: "Check-in date",
  checkOut: "Check-out date",
  guests: "Number of guests",
  numberOfRooms: "Number of rooms",
  name: "Full name",
  country: "Country",
  email: "Email",
  phone: "Phone / WhatsApp",
  arrivalInfo: "Arrival information",
  message: "Message",
};

function StepLegend({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <legend className="mb-1 flex items-center gap-3 font-display text-[1.45rem] font-medium text-forest-900">
      <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full border border-forest-600 font-sans text-sm font-semibold text-forest-700">
        {n}
      </span>
      <span>
        <span className="sr-only">Step {n}: </span>
        {children}
      </span>
    </legend>
  );
}
