import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatDateTime, mailtoHref, telHref, whatsappHref } from "@/lib/utils/format";
import { deleteContactMessage, updateMessageStatus } from "@/server/actions/admin/inbox";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AdminPageTitle, Panel, StatusBadge } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/shared/icons";

export const metadata = { title: "Message" };

const STATUSES = ["NEW", "READ", "REPLIED", "ARCHIVED"] as const;

export default async function MessageDetailPage({ params }: PageProps<"/admin/messages/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const m = await prisma.contactMessage.findUnique({ where: { id } });
  if (!m) notFound();

  return (
    <>
      <Link href="/admin/messages" className="inline-flex min-h-10 items-center text-sm font-semibold text-clay-700">
        ← All messages
      </Link>
      <AdminPageTitle title={m.name} description={<StatusBadge status={m.status} />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Message" className="lg:col-span-2">
          <p className="text-xs text-muted">{formatDateTime(m.createdAt)}</p>
          <p className="mt-3 whitespace-pre-wrap text-ink">{m.message}</p>
        </Panel>
        <div className="space-y-6">
          <Panel title="Reply">
            <div className="space-y-2 text-sm">
              <a href={mailtoHref(m.email, "Re: your message to Lama Hotel & Lodge")} className="flex items-center gap-2 rounded-lg border border-cream-200 px-3 py-2.5 break-all hover:bg-cream-50">
                <Mail size={16} className="shrink-0" aria-hidden /> {m.email}
              </a>
              {m.phone && (
                <>
                  <a href={telHref(m.phone)} className="flex items-center gap-2 rounded-lg border border-cream-200 px-3 py-2.5 hover:bg-cream-50">
                    <Phone size={16} aria-hidden /> {m.phone}
                  </a>
                  <a href={whatsappHref(m.phone, `Hello ${m.name}, thank you for your message to Lama Hotel & Lodge.`)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-cream-200 px-3 py-2.5 hover:bg-cream-50">
                    <WhatsAppIcon size={16} /> WhatsApp
                  </a>
                </>
              )}
            </div>
          </Panel>
          <Panel title="Mark as">
            <div className="flex flex-wrap gap-2">
              {STATUSES.filter((s) => s !== m.status).map((s) => (
                <AdminForm key={s} action={updateMessageStatus}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="status" value={s} />
                  <SubmitButton variant="outline">{s.charAt(0) + s.slice(1).toLowerCase()}</SubmitButton>
                </AdminForm>
              ))}
            </div>
            <div className="mt-4 border-t border-cream-100 pt-4">
              <ConfirmDialog action={deleteContactMessage} fields={{ id: m.id }} title="Delete this message?" description="This cannot be undone." />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
