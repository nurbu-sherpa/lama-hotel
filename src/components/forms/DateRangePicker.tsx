"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/format";

// Dates are ISO "YYYY-MM-DD" strings throughout, so plain string comparison orders them.
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function iso(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}
function monthOf(date: string) {
  const [y, m] = date.split("-").map(Number);
  return { y, m: m - 1 };
}
function shiftMonth({ y, m }: { y: number; m: number }, by: number) {
  const d = new Date(Date.UTC(y, m + by, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
}
function nightsBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}
function pretty(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
}

type Props = {
  checkIn: string;
  checkOut: string;
  today: string;
  onChange: (checkIn: string, checkOut: string) => void;
  errors?: { checkIn?: string[]; checkOut?: string[] };
  className?: string;
};

/** One calendar for the whole stay: first click sets check-in, second sets check-out. Submits as hidden `checkIn` / `checkOut`. */
export function DateRangePicker({ checkIn, checkOut, today, onChange, errors, className }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState("");
  const [view, setView] = useState(() => monthOf(checkIn || today));
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pickingOut = Boolean(checkIn && !checkOut);
  const rangeEnd = checkOut || (pickingOut && hover > checkIn ? hover : "");
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const thisMonth = monthOf(today);
  const atFirstMonth = view.y === thisMonth.y && view.m === thisMonth.m;

  function select(day: string) {
    if (pickingOut && day > checkIn) {
      onChange(checkIn, day);
      setOpen(false);
    } else {
      onChange(day, "");
    }
  }

  function openAt(which: "in" | "out") {
    // Clicking "Check-out" with a check-in set means "change the check-out".
    if (which === "out" && checkIn) onChange(checkIn, "");
    setView(monthOf(checkIn || today));
    setOpen(true);
  }

  const err = errors?.checkIn?.[0] || errors?.checkOut?.[0];
  const trigger =
    "field-input flex items-center gap-3 text-left aria-expanded:border-forest-600 aria-expanded:ring-2 aria-expanded:ring-forest-500/25";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input type="hidden" name="checkIn" value={checkIn} />
      <input type="hidden" name="checkOut" value={checkOut} />

      <div className="grid gap-5 sm:grid-cols-2">
        {(["in", "out"] as const).map((which) => {
          const value = which === "in" ? checkIn : checkOut;
          const active = open && (which === "in" ? !pickingOut : pickingOut);
          return (
            <div key={which}>
              <span id={`${id}-${which}-label`} className="field-label">
                {which === "in" ? "Check-in date" : "Check-out date"}
              </span>
              <button
                type="button"
                aria-labelledby={`${id}-${which}-label ${id}-${which}-value`}
                aria-haspopup="dialog"
                aria-expanded={active}
                onClick={() => openAt(which)}
                className={cn(trigger, (which === "in" ? errors?.checkIn : errors?.checkOut)?.length ? "border-red-600 ring-red-600/15" : undefined)}
              >
                <CalendarDays size={18} className="shrink-0 text-forest-600" aria-hidden />
                <span id={`${id}-${which}-value`} className={value ? "text-ink" : "text-muted/60"}>
                  {value ? pretty(value, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "Select date"}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      {err && (
        <p className="field-error" role="alert">
          {err}
        </p>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={pickingOut ? "Choose check-out date" : "Choose check-in date"}
          className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border border-cream-200 bg-white p-4 shadow-[0_24px_60px_-20px_rgb(14_26_49/0.35)] sm:p-5"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-forest-900">
              {pickingOut ? "Now pick your check-out date" : "Pick your check-in date"}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setView((v) => shiftMonth(v, -1))}
                disabled={atFirstMonth}
                aria-label="Previous month"
                className="grid h-9 w-9 place-content-center rounded-full text-forest-800 hover:bg-forest-50 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setView((v) => shiftMonth(v, 1))}
                aria-label="Next month"
                className="grid h-9 w-9 place-content-center rounded-full text-forest-800 hover:bg-forest-50"
              >
                <ChevronRight size={18} aria-hidden />
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2" onPointerLeave={() => setHover("")}>
            {[view, shiftMonth(view, 1)].map((mo, i) => (
              <Month
                key={`${mo.y}-${mo.m}`}
                {...mo}
                className={i === 1 ? "hidden md:block" : undefined}
                today={today}
                checkIn={checkIn}
                rangeEnd={rangeEnd}
                onPick={select}
                onHover={setHover}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-cream-200 pt-4">
            <p className="text-sm text-muted" aria-live="polite">
              {nights > 0 ? (
                <>
                  <span className="font-semibold text-forest-900">
                    {nights} night{nights > 1 ? "s" : ""}
                  </span>{" "}
                  · {pretty(checkIn)} → {pretty(checkOut)}
                </>
              ) : checkIn ? (
                `Check-in ${pretty(checkIn)}`
              ) : (
                "Select your dates"
              )}
            </p>
            {checkIn && (
              <button type="button" onClick={() => onChange("", "")} className="text-sm font-semibold text-forest-800 underline underline-offset-4 hover:text-clay-700">
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Month({
  y,
  m,
  className,
  today,
  checkIn,
  rangeEnd,
  onPick,
  onHover,
}: {
  y: number;
  m: number;
  className?: string;
  today: string;
  checkIn: string;
  rangeEnd: string;
  onPick: (day: string) => void;
  onHover: (day: string) => void;
}) {
  const lead = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const label = new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-GB", { timeZone: "UTC", month: "long", year: "numeric" });

  return (
    <div className={className}>
      <p className="mb-2 text-center font-display text-lg font-semibold text-forest-900">{label}</p>
      <div className="grid grid-cols-7 text-center text-xs font-semibold tracking-wide text-muted uppercase">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1.5">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = iso(y, m, i + 1);
          const disabled = day < today;
          const isStart = day === checkIn;
          const isEnd = day === rangeEnd;
          const inRange = Boolean(checkIn && rangeEnd && day > checkIn && day < rangeEnd);
          return (
            // Range band sits on the cell; the round day button sits on top of it.
            <div
              key={day}
              className={cn(
                "flex justify-center",
                (inRange || (isStart && rangeEnd) || isEnd) && "bg-forest-50",
                isStart && rangeEnd && "rounded-l-full",
                isEnd && "rounded-r-full",
              )}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(day)}
                onPointerEnter={() => onHover(day)}
                aria-label={new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                aria-pressed={isStart || isEnd}
                className={cn(
                  "grid h-10 w-10 place-content-center rounded-full text-[0.95rem] font-medium transition-colors sm:h-11 sm:w-11",
                  isStart || isEnd
                    ? "bg-forest-800 font-semibold text-white shadow-md"
                    : disabled
                      ? "cursor-not-allowed text-ink/25 line-through decoration-ink/20"
                      : "text-ink hover:bg-forest-100",
                  day === today && !isStart && !isEnd && "ring-2 ring-clay-400 ring-inset",
                )}
              >
                {i + 1}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
