import { Camera } from "lucide-react";
import { getGallery } from "@/lib/data/public";
import { buildMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/public/PageHeader";
import { GalleryGrid } from "@/components/public/GalleryGrid";

export function generateMetadata() {
  return buildMetadata({ path: "/gallery", pageSlug: "gallery", title: "Gallery" });
}

export default async function GalleryPage() {
  const { images, categories } = await getGallery();
  const hasHotelPhotos = images.some((i) => i.isHotelPhoto);

  return (
    <>
      <PageHeader
        eyebrow="Gallery"
        title={hasHotelPhotos ? "Photos of the lodge & Jiri" : "Jiri & its surroundings"}
        crumbs={[{ name: "Gallery", path: "/gallery" }]}
        intro={<p>Scenes from Jiri, the mountains and the countryside around our lodge.</p>}
      />
      <section className="container-page py-12 sm:py-16">
        {!hasHotelPhotos && (
          <div className="mb-10 flex gap-3 border-l-2 border-clay-600 bg-clay-50 px-5 py-4 text-[0.98rem] text-clay-700">
            <Camera size={20} className="mt-0.5 shrink-0" aria-hidden />
            <p>
              <strong>Photos of Lama Hotel &amp; Lodge are coming soon.</strong> The images below show Jiri and its surroundings — they are not photos of the
              hotel or its rooms.
            </p>
          </div>
        )}
        {images.length > 0 ? (
          <GalleryGrid images={images} categories={categories} />
        ) : (
          <p className="text-muted">Photos will be added soon.</p>
        )}
      </section>
    </>
  );
}
