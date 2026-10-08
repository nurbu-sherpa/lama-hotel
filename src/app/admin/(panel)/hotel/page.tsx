import { prisma } from "@/lib/db";
import { updateHotelSettings } from "@/server/actions/admin/hotel";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { AText, ATextArea } from "@/components/admin/Fields";
import { AdminPageTitle, Panel } from "@/components/admin/ui";

export const metadata = { title: "Hotel Information" };

export default async function HotelInfoPage() {
  const h = await prisma.hotelSettings.findUniqueOrThrow({ where: { id: "default" } });
  return (
    <>
      <AdminPageTitle title="Hotel Information" description="These details appear across the whole website — header, footer, contact page, location page and Google structured data." />
      <AdminForm action={updateHotelSettings} className="space-y-6">
        <Panel title="Basic details">
          <div className="grid gap-5 sm:grid-cols-2">
            <AText label="Hotel name" name="name" defaultValue={h.name} required />
            <AText label="Tagline" name="tagline" defaultValue={h.tagline} required />
            <ATextArea label="Short description" name="description" defaultValue={h.description} required rows={3} className="sm:col-span-2" hint="Used in the footer, search results and Google structured data." />
          </div>
        </Panel>

        <Panel title="Contact">
          <div className="grid gap-5 sm:grid-cols-2">
            <AText label="Phone" name="phone" type="tel" defaultValue={h.phone} required hint="Local numbers get +977 added automatically for call links." />
            <AText label="WhatsApp number" name="whatsapp" type="tel" defaultValue={h.whatsapp} required hint="Include the country code, e.g. +9779818486480." />
            <AText label="Email" name="email" type="email" defaultValue={h.email} required className="sm:col-span-2" />
          </div>
        </Panel>

        <Panel title="Address">
          <div className="grid gap-5 sm:grid-cols-2">
            <AText label="Address" name="address" defaultValue={h.address} required className="sm:col-span-2" />
            <AText label="Location description" name="locationDescription" defaultValue={h.locationDescription} className="sm:col-span-2" hint="How guests can find you, e.g. “Right side of Hotel Paras, Jiri Bazaar”." />
            <AText label="City" name="city" defaultValue={h.city} required />
            <AText label="District / region" name="region" defaultValue={h.region} optional />
            <AText label="Country" name="country" defaultValue={h.country} required />
          </div>
        </Panel>

        <Panel title="Check-in & check-out" description="Shown on the homepage, room pages, booking page, FAQ and footer.">
          <div className="grid gap-5 sm:grid-cols-2">
            <AText label="Check-in time" name="checkInTime" type="time" defaultValue={h.checkInTime} required />
            <AText label="Check-out time" name="checkOutTime" type="time" defaultValue={h.checkOutTime} required />
          </div>
        </Panel>

        <Panel title="Online profiles" description="Leave empty until you have the account. Icons only appear on the website when a link is added.">
          <div className="grid gap-5 sm:grid-cols-2">
            <AText label="Facebook page URL" name="facebookUrl" type="url" placeholder="https://facebook.com/…" defaultValue={h.facebookUrl} optional />
            <AText label="Instagram URL" name="instagramUrl" type="url" placeholder="https://instagram.com/…" defaultValue={h.instagramUrl} optional />
            <AText label="TikTok URL" name="tiktokUrl" type="url" placeholder="https://tiktok.com/@…" defaultValue={h.tiktokUrl} optional />
            <AText label="YouTube URL" name="youtubeUrl" type="url" placeholder="https://youtube.com/…" defaultValue={h.youtubeUrl} optional />
            <AText label="Google Business Profile URL" name="googleBusinessUrl" type="url" defaultValue={h.googleBusinessUrl} optional className="sm:col-span-2" />
          </div>
        </Panel>

        <div className="sticky bottom-4 flex justify-end">
          <SubmitButton className="shadow-lg">Save hotel information</SubmitButton>
        </div>
      </AdminForm>
    </>
  );
}
