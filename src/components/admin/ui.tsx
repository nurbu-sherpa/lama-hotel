import Link from "next/link";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils/format";

/** Small server-safe admin building blocks: page title, card, empty/loading states, badges, data table. */

export function AdminPageTitle({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-forest-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, children, className }: { title?: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-cream-200 bg-white p-5 shadow-xs sm:p-6", className)}>
      {title && <h2 className="text-base font-semibold text-forest-900">{title}</h2>}
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className={title || description ? "mt-5" : undefined}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-cream-300 bg-white px-6 py-14 text-center">
      <Inbox size={36} className="text-forest-300" aria-hidden />
      <p className="mt-3 font-semibold text-forest-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}


/**
 * Status colours — the single source of truth for every status badge in the admin.
 * One colour = one meaning; visual weight = how much attention it needs.
 * Emerald is used for status meaning only; `forest` stays the brand colour.
 */
const TONES = {
  urgent: "bg-amber-100 text-amber-900 font-semibold", // needs action now
  waiting: "bg-amber-50 text-amber-800 font-medium", // awaiting / in progress
  upcoming: "bg-blue-50 text-blue-700 font-medium", // confirmed, all set
  active: "bg-emerald-700 text-white font-medium", // happening right now (the only solid badge)
  good: "bg-emerald-50 text-emerald-700 font-medium", // healthy / free
  warning: "bg-orange-50 text-orange-700 font-medium", // problem worth noticing
  bad: "bg-red-50 text-red-700 font-medium", // cancelled / blocked
  done: "bg-slate-100 text-slate-600 font-medium", // finished
  off: "bg-slate-200 text-slate-700 font-medium", // disabled
} as const;

export type Tone = keyof typeof TONES;

const STATUS_TONE: Record<string, Tone> = {
  // Inquiries & messages
  NEW: "urgent",
  CONTACTED: "waiting",
  READ: "waiting",
  COMPLETED: "done",
  REPLIED: "done",
  ARCHIVED: "done",
  // Reservations
  INQUIRY: "waiting",
  PENDING: "waiting",
  CONFIRMED: "upcoming",
  CHECKED_IN: "active",
  CHECKED_OUT: "done",
  CANCELLED: "bad",
  NO_SHOW: "warning",
  // Payment
  UNPAID: "waiting",
  PARTIAL: "warning",
  PAID: "good",
  REFUNDED: "done",
  // Room availability
  AVAILABLE: "good",
  LIMITED: "warning",
  FULLY_BOOKED: "bad",
  UNAVAILABLE: "off",
};

/** " checked-in " → "CHECKED_IN" */
const normalizeStatus = (status: string) => status.trim().toUpperCase().replace(/[\s-]+/g, "_");

/** Tone for a status (case/spacing-insensitive). Unknown statuses are "done". */
export function toneFor(status: string) {
  const tone = STATUS_TONE[normalizeStatus(status)] ?? "done";
  return { tone, badge: TONES[tone] };
}

/** Status → badge classes (derived from the tones; kept for existing imports). */
export const BADGE: Record<string, string> = Object.fromEntries(Object.keys(STATUS_TONE).map((s) => [s, toneFor(s).badge]));

export function statusLabel(status: string) {
  const s = status.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs leading-5 whitespace-nowrap", toneFor(status).badge, className)}>
      {label ?? statusLabel(normalizeStatus(status))}
    </span>
  );
}

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

/** Responsive table: a real table on desktop, stacked cards on mobile. */
export function DataTable<T>({ rows, columns, rowKey, rowHref, caption }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; rowHref?: (r: T) => string; caption: string }) {
  return (
    <>
      <div className="relative hidden overflow-x-auto rounded-lg border border-cream-200 bg-white shadow-xs md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-cream-200 bg-cream-50 text-xs font-medium text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.header} scope="col" className={cn("px-4 py-3 font-semibold", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} className="border-b border-cream-100 last:border-0 hover:bg-cream-50">
                {columns.map((c, i) => (
                  <td key={c.header} className={cn("px-4 py-3 align-top", c.className)}>
                    {i === 0 && rowHref ? (
                      <Link href={rowHref(r)} className="font-semibold text-forest-800 underline-offset-2 hover:underline">
                        {c.cell(r)}
                      </Link>
                    ) : (
                      c.cell(r)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden" aria-label={caption}>
        {rows.map((r) => (
          <li key={rowKey(r)} className="rounded-lg border border-cream-200 bg-white p-4 shadow-xs">
            {rowHref ? (
              <Link href={rowHref(r)} className="block">
                <MobileRow row={r} columns={columns} />
              </Link>
            ) : (
              <MobileRow row={r} columns={columns} />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function MobileRow<T>({ row, columns }: { row: T; columns: Column<T>[] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {columns.map((c) => (
        <div key={c.header} className="contents">
          <dt className="text-muted">{c.header}</dt>
          <dd className="min-w-0 break-words text-ink">{c.cell(row)}</dd>
        </div>
      ))}
    </dl>
  );
}
