import type { PageSection } from "@prisma/client";
import { updateSection } from "@/server/actions/admin/content";
import { AdminForm, SubmitButton } from "./AdminForm";
import { ACheckbox, AText, ATextArea } from "./Fields";
import { ImageUploader } from "./ImageUploader";
import { RichTextEditor } from "./RichTextEditor";

/** Edit one content block. `bodyMode` decides between a single line, plain textarea or rich text. */
export function SectionEditor({
  section,
  headingLabel = "Heading",
  bodyLabel = "Text",
  bodyMode = "rich",
  withImage = false,
  hideHeading = false,
  hint,
}: {
  section: PageSection;
  headingLabel?: string;
  bodyLabel?: string;
  bodyMode?: "line" | "plain" | "rich";
  withImage?: boolean;
  hideHeading?: boolean;
  hint?: string;
}) {
  return (
    <AdminForm action={updateSection} className="space-y-4">
      <input type="hidden" name="id" value={section.id} />
      {hideHeading ? <input type="hidden" name="heading" value={section.heading} /> : <AText label={headingLabel} name="heading" defaultValue={section.heading} maxLength={200} />}
      {bodyMode === "line" && <AText label={bodyLabel} name="body" defaultValue={section.body} maxLength={300} hint={hint} />}
      {bodyMode === "plain" && <ATextArea label={bodyLabel} name="body" defaultValue={section.body} rows={3} maxLength={2000} hint={hint} />}
      {bodyMode === "rich" && <RichTextEditor label={bodyLabel} name="body" defaultValue={section.body} hint={hint} />}

      {withImage ? (
        <div className="grid gap-4 rounded-xl bg-cream-50 p-4 sm:grid-cols-2">
          <div className="sm:row-span-3">
            <ImageUploader label="Image" currentUrl={section.imageUrl || undefined} />
          </div>
          <AText label="Image description (alt text)" name="imageAlt" defaultValue={section.imageAlt} maxLength={250} />
          <AText
            label="Image label / credit"
            name="imageCredit"
            defaultValue={section.imageCredit}
            maxLength={250}
            hint="Shown on the image. For Jiri photos, say so (e.g. “Jiri Bazaar”) — never call them hotel photos."
          />
          {section.imageUrl && <ACheckbox label="Remove image" name="removeImage" />}
        </div>
      ) : (
        <>
          <input type="hidden" name="imageAlt" value={section.imageAlt} />
          <input type="hidden" name="imageCredit" value={section.imageCredit} />
        </>
      )}
      <div className="flex justify-end">
        <SubmitButton>Save</SubmitButton>
      </div>
    </AdminForm>
  );
}
