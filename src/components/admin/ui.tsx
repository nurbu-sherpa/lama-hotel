import Link from "next/link";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils/format";

/** Small server-safe admin building blocks: page title, card, empty/loading states, badges, data table. */

export function AdminPageTitle({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex animate-fade-up flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-medium text-forest-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, children, className }: { title?: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-cream-200 bg-white p-5 sm:p-6", className)}>
      {title && <h2 className="text-lg font-semibold text-forest-900">{title}</h2>}
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


const BADGE: Record<string, string> = {
  NEW: "bg-clay-100 text-clay-700",
  CONTACTED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-forest-100 text-forest-800",
  CANCELLED: "bg-stone-200 text-stone-700",
  COMPLETED: "bg-sky-100 text-sky-800",
  READ: "bg-amber-100 text-amber-800",
  REPLIED: "bg-forest-100 text-forest-800",
  ARCHIVED: "bg-stone-200 text-stone-700",
  AVAILABLE: "bg-forest-100 text-forest-800",
  LIMITED: "bg-amber-100 text-amber-800",
  FULLY_BOOKED: "bg-red-100 text-red-800",
  INQUIRY: "bg-cream-200 text-ink",
  PENDING: "bg-amber-100 text-amber-800",
  CHECKED_IN: "bg-forest-700 text-white",
  CHECKED_OUT: "bg-sky-100 text-sky-800",
  NO_SHOW: "bg-stone-200 text-stone-700",
  UNPAID: "bg-clay-100 text-clay-700",
  PARTIAL: "bg-amber-100 text-amber-800",
  PAID: "bg-forest-100 text-forest-800",
  REFUNDED: "bg-stone-200 text-stone-700",
  UNAVAILABLE: "bg-stone-200 text-stone-700",
};

export function statusLabel(status: string) {
  const s = status.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", BADGE[status] ?? "bg-cream-200 text-ink")}>
      {statusLabel(status)}
    </span>
  );
}

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

/** Responsive table: a real table on desktop, stacked cards on mobile. */
export function DataTable<T>({ rows, columns, rowKey, rowHref, caption }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; rowHref?: (r: T) => string; caption: string }) {
  return (
    <>
      <div className="relative hidden overflow-x-auto rounded-lg border border-cream-200 bg-white md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-cream-200 bg-cream-50 text-xs tracking-wider text-muted uppercase">
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
          <li key={rowKey(r)} className="rounded-xl border border-cream-200 bg-white p-4">
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
