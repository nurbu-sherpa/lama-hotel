import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { updateMapsSettings } from "@/server/actions/admin/hotel";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { AText, ATextArea } from "@/components/admin/Fields";
import { AdminPageTitle, Panel } from "@/components/admin/ui";

export const metadata = { title: "Google Maps" };

export default async function MapsPage() {
  const h = await prisma.hotelSettings.findUniqueOrThrow({ where: { id: "default" } });
  return (
    <>
      <AdminPageTitle title="Google Maps" description="Controls every “Get Directions” button and the map on the Location page." />
      <AdminForm action={updateMapsSettings} className="space-y-6">
        <Panel title="Directions link">
          <AText label="Google Maps link" name="googleMapsUrl" type="url" required defaultValue={h.googleMapsUrl} hint="In Google Maps: open your hotel → Share → Copy link." />
          <a href={h.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-clay-700">
            Test current link <ExternalLink size={14} aria-hidden />
          </a>
          <AText label="Location description" name="locationDescription" defaultValue={h.locationDescription} className="mt-5" optional />
        </Panel>

        <Panel
          title="Embedded map (optional)"
          description="To show a map on the Location page: in Google Maps open your hotel → Share → Embed a map → Copy HTML, and paste it here. Leave empty to show a simple “Open in Google Maps” card instead."
        >
          <ATextArea label="Embed code or link" name="googleMapsEmbedUrl" rows={3} defaultValue={h.googleMapsEmbedUrl} optional placeholder='<iframe src="https://www.google.com/maps/embed?pb=…"></iframe>' />
          {h.googleMapsEmbedUrl && (
            <iframe src={h.googleMapsEmbedUrl} title="Map preview" className="mt-4 aspect-video w-full rounded-xl border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          )}
        </Panel>

        <Panel title="Google Business Profile">
          <AText label="Google Business Profile URL" name="googleBusinessUrl" type="url" defaultValue={h.googleBusinessUrl} optional hint="Added to Google structured data (sameAs) when set." />
        </Panel>

        <div className="flex justify-end">
          <SubmitButton>Save map settings</SubmitButton>
        </div>
      </AdminForm>
    </>
  );
}
