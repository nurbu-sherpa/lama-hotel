import Link from "next/link";
import { prisma } from "@/lib/db";
import { cn, formatDateTime } from "@/lib/utils/format";
import { AdminPageTitle, DataTable, EmptyState, StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "Contact Messages" };

const FILTERS = ["INBOX", "NEW", "READ", "REPLIED", "ARCHIVED", "ALL"] as const;

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  const sp = await searchParams;
  const filter = (FILTERS as readonly string[]).includes(String(sp.status)) ? (sp.status as (typeof FILTERS)[number]) : "INBOX";
  const where =
    filter === "INBOX"
      ? { status: { in: ["NEW" as const, "READ" as const, "REPLIED" as const] } }
      : filter === "ALL"
        ? {}
        : { status: filter as "NEW" | "READ" | "REPLIED" | "ARCHIVED" };
  const rows = await prisma.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <>
      <AdminPageTitle title="Contact Messages" description="Messages sent from the Contact page." />
      <nav aria-label="Filter messages" className="relative mb-5 flex gap-1 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/admin/messages?status=${f}`}
            aria-current={filter === f ? "page" : undefined}
            className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium", filter === f ? "bg-forest-800 text-white" : "bg-white text-ink hover:bg-cream-100")}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState title="No messages here" />
      ) : (
        <DataTable
          caption="Contact messages"
          rows={rows}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/messages/${r.id}`}
          columns={[
            { header: "From", cell: (r) => r.name },
            { header: "Message", cell: (r) => <span className="line-clamp-2 text-ink/80">{r.message}</span>, className: "max-w-md" },
            { header: "Email", cell: (r) => r.email },
            { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            { header: "Received", cell: (r) => <span className="text-muted">{formatDateTime(r.createdAt)}</span> },
          ]}
        />
      )}
    </>
  );
}
