import Image from "next/image";
import { prisma } from "@/lib/db";
import { storageMode } from "@/lib/storage";
import { deleteGalleryImage, moveGalleryImage, updateGalleryImage, uploadGalleryImage } from "@/server/actions/admin/gallery";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { ACheckbox, ASelect, AText } from "@/components/admin/Fields";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { MoveButtons } from "@/components/admin/RowActions";
import { AdminPageTitle, EmptyState, Panel } from "@/components/admin/ui";

export const metadata = { title: "Gallery" };

type Category = { id: string; name: string };

function MetaFields({ categories, img }: { categories: Category[]; img?: { title: string; caption: string; alt: string; credit: string; categoryId: string | null; isHotelPhoto: boolean; featured: boolean } }) {
  return (
    <>
      <AText label="Title" name="title" defaultValue={img?.title} required maxLength={150} />
      <ASelect label="Category" name="categoryId" defaultValue={img?.categoryId ?? ""}>
        <option value="">No category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </ASelect>
      <AText label="Description (alt text)" name="alt" defaultValue={img?.alt} required maxLength={250} className="sm:col-span-2" hint="Describe what the photo shows, for blind visitors and Google." />
      <AText label="Caption" name="caption" defaultValue={img?.caption} optional maxLength={500} />
      <AText label="Photo credit" name="credit" defaultValue={img?.credit} optional maxLength={250} hint="Required for photos you didn't take yourself." />
      <ACheckbox
        label="This is a photo of Lama Hotel & Lodge"
        name="isHotelPhoto"
        defaultChecked={img?.isHotelPhoto ?? false}
        hint="Tick only for real photos of the hotel or rooms. Leave unticked for Jiri / mountain / travel photos."
        className="sm:col-span-2"
      />
      <ACheckbox label="Featured" name="featured" defaultChecked={img?.featured ?? false} />
    </>
  );
}

export default async function AdminGalleryPage() {
  const [images, categories] = await Promise.all([
    prisma.galleryImage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], include: { category: { select: { name: true } } } }),
    prisma.galleryCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  const uploadsReady = storageMode() !== "unconfigured";
  const hotelPhotoCount = images.filter((i) => i.isHotelPhoto).length;

  return (
    <>
      <AdminPageTitle
        title="Gallery"
        description="The current photos show Jiri and its surroundings (temporary). Upload real photos of the hotel and tick “This is a photo of Lama Hotel & Lodge”. You can then delete the temporary images."
      />

      {hotelPhotoCount === 0 && (
        <p className="mb-6 rounded-xl border border-clay-100 bg-clay-50 px-4 py-3 text-sm text-clay-700">
          No hotel photos yet — the public gallery currently tells visitors that hotel photos are coming soon.
        </p>
      )}

      <Panel title="Upload a photo" className="mb-8">
        {uploadsReady ? (
          <AdminForm action={uploadGalleryImage} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <ImageUploader required label="Photo" />
            </div>
            <MetaFields categories={categories} />
            <div className="sm:col-span-2 sm:text-right">
              <SubmitButton>Upload photo</SubmitButton>
            </div>
          </AdminForm>
        ) : (
          <p className="text-sm text-muted">Image storage is not configured. Ask your developer to set the Cloudinary environment variables (see Settings → System status).</p>
        )}
      </Panel>

      {images.length === 0 ? (
        <EmptyState title="No photos yet" />
      ) : (
        <ul className="space-y-3">
          {images.map((img, i) => (
            <li key={img.id} className="rounded-lg border border-cream-200 bg-white p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-cream-100 sm:w-36">
                  <Image src={img.url} alt={img.alt} fill sizes="144px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-forest-900">{img.title}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${img.isHotelPhoto ? "bg-forest-100 text-forest-800" : "bg-cream-200 text-ink"}`}>
                      {img.isHotelPhoto ? "Hotel photo" : "Destination photo"}
                    </span>
                    {img.category && <span className="rounded-full bg-cream-100 px-2 py-0.5">{img.category.name}</span>}
                    {img.featured && <span className="rounded-full bg-clay-100 px-2 py-0.5 text-clay-700">Featured</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <MoveButtons action={moveGalleryImage} id={img.id} isFirst={i === 0} isLast={i === images.length - 1} label={img.title} />
                  <ConfirmDialog action={deleteGalleryImage} fields={{ id: img.id }} title={`Delete “${img.title}”?`} description="The photo will be removed from the website." triggerLabel="" />
                </div>
              </div>
              <details className="mt-3">
                <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-semibold text-clay-700">Edit details or replace photo</summary>
                <AdminForm action={updateGalleryImage} closeOnSuccess className="mt-4 grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="id" value={img.id} />
                  {uploadsReady && (
                    <div className="sm:col-span-2">
                      <ImageUploader label="Replace photo (optional)" currentUrl={img.url} />
                    </div>
                  )}
                  <MetaFields categories={categories} img={img} />
                  <div className="sm:col-span-2 sm:text-right">
                    <SubmitButton>Save</SubmitButton>
                  </div>
                </AdminForm>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
