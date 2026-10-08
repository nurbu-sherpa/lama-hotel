import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { createSection, deleteSection, moveSection, updatePageMeta } from "@/server/actions/admin/content";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { AText, ATextArea } from "@/components/admin/Fields";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { SectionEditor } from "@/components/admin/SectionEditor";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { MoveButtons } from "@/components/admin/RowActions";
import { AdminPageTitle, Panel } from "@/components/admin/ui";

export const metadata = { title: "Edit Jiri guide page" };

const PATHS: Record<string, string> = { jiri: "/jiri", "jiri-things-to-do": "/jiri/things-to-do", "jiri-how-to-reach": "/jiri/how-to-reach" };

export default async function EditGuidePage({ params }: PageProps<"/admin/jiri/[slug]">) {
  const { slug } = await params;
  if (!PATHS[slug]) notFound();
  const page = await prisma.page.findUnique({ where: { slug }, include: { sections: { orderBy: { sortOrder: "asc" } } } });
  if (!page) notFound();

  return (
    <>
      <Link href="/admin/jiri" className="inline-flex min-h-10 items-center text-sm font-semibold text-clay-700">
        ← Jiri Guide
      </Link>
      <AdminPageTitle
        title={page.title}
        actions={
          <a href={PATHS[slug]} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cream-300 bg-white px-3 text-sm font-semibold hover:bg-cream-100">
            View page <ExternalLink size={14} aria-hidden />
          </a>
        }
      />

      <Panel title="Page title & introduction" className="mb-6">
        <AdminForm action={updatePageMeta} className="space-y-4">
          <input type="hidden" name="id" value={page.id} />
          <AText label="Page title" name="title" defaultValue={page.title} required maxLength={150} />
          <ATextArea label="Introduction" name="intro" defaultValue={page.intro} rows={3} maxLength={2000} />
          <div className="flex justify-end">
            <SubmitButton>Save</SubmitButton>
          </div>
        </AdminForm>
      </Panel>

      <h2 className="mb-3 text-lg font-semibold text-forest-900">Sections</h2>
      <div className="space-y-4">
        {page.sections.map((s, i) => (
          <details key={s.id} className="rounded-lg border border-cream-200 bg-white">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-4">
              <span className="flex-1 font-semibold text-forest-900">{s.heading || "(untitled section)"}</span>
              <span className="inline-flex min-h-10 items-center text-sm font-semibold text-clay-700">Edit</span>
            </summary>
            <div className="border-t border-cream-100 px-5 py-5">
              <SectionEditor section={s} withImage />
              <div className="mt-4 flex gap-2 border-t border-cream-100 pt-4">
                <MoveButtons action={moveSection} id={s.id} isFirst={i === 0} isLast={i === page.sections.length - 1} label={s.heading} />
                <ConfirmDialog action={deleteSection} fields={{ id: s.id }} title={`Delete “${s.heading}”?`} description="This section will be removed from the page." triggerLabel="Delete section" />
              </div>
            </div>
          </details>
        ))}
      </div>

      <Panel title="Add a section" className="mt-8">
        <AdminForm action={createSection} resetOnSuccess className="space-y-4">
          <input type="hidden" name="pageId" value={page.id} />
          <AText label="Heading" name="heading" required maxLength={200} />
          <RichTextEditor label="Text" name="body" />
          <div className="grid gap-4 rounded-xl bg-cream-50 p-4 sm:grid-cols-2">
            <div className="sm:row-span-2">
              <ImageUploader label="Image (optional)" />
            </div>
            <AText label="Image description (alt text)" name="imageAlt" maxLength={250} />
            <AText label="Image label / credit" name="imageCredit" maxLength={250} />
          </div>
          <div className="flex justify-end">
            <SubmitButton>Add section</SubmitButton>
          </div>
        </AdminForm>
      </Panel>
    </>
  );
}
