import { prisma } from "@/lib/db";
import { createFaq, deleteFaq, moveFaq, updateFaq } from "@/server/actions/admin/facilities";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { ACheckbox, AText } from "@/components/admin/Fields";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { MoveButtons } from "@/components/admin/RowActions";
import { AdminPageTitle, EmptyState, Panel } from "@/components/admin/ui";

export const metadata = { title: "FAQs" };

const TOKENS_HINT = "Tip: {{checkInTime}}, {{checkOutTime}}, {{phone}}, {{email}} and {{location}} are replaced with your current hotel details automatically.";

export default async function FaqsPage() {
  const faqs = await prisma.fAQ.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <AdminPageTitle title="FAQs" description="Questions shown on the FAQ page (also shared with Google as FAQ structured data)." />

      <Panel title="Add a question" className="mb-6">
        <AdminForm action={createFaq} resetOnSuccess className="space-y-4">
          <AText label="Question" name="question" required maxLength={300} />
          <RichTextEditor label="Answer" name="answer" rows={4} required hint={TOKENS_HINT} />
          <div className="flex items-center justify-between">
            <ACheckbox label="Show on website" name="active" defaultChecked />
            <SubmitButton>Add question</SubmitButton>
          </div>
        </AdminForm>
      </Panel>

      {faqs.length === 0 ? (
        <EmptyState title="No questions yet" />
      ) : (
        <ul className="space-y-3">
          {faqs.map((f, i) => (
            <li key={f.id} className="rounded-lg border border-cream-200 bg-white p-4">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                  <span className="flex-1 font-semibold text-forest-900">
                    {f.question} {!f.active && <span className="text-xs font-normal text-muted">(hidden)</span>}
                  </span>
                  <span className="inline-flex min-h-10 items-center text-sm font-semibold text-clay-700">Edit</span>
                </summary>
                <AdminForm action={updateFaq} className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={f.id} />
                  <AText label="Question" name="question" defaultValue={f.question} required maxLength={300} />
                  <RichTextEditor label="Answer" name="answer" defaultValue={f.answer} rows={4} required hint={TOKENS_HINT} />
                  <div className="flex items-center justify-between">
                    <ACheckbox label="Show on website" name="active" defaultChecked={f.active} />
                    <SubmitButton>Save</SubmitButton>
                  </div>
                </AdminForm>
              </details>
              <div className="mt-3 flex gap-2 border-t border-cream-100 pt-3">
                <MoveButtons action={moveFaq} id={f.id} isFirst={i === 0} isLast={i === faqs.length - 1} label="question" />
                <ConfirmDialog action={deleteFaq} fields={{ id: f.id }} title="Delete this question?" description={f.question} triggerLabel="" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
