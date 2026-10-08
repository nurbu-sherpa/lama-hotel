import Link from "next/link";
import { prisma } from "@/lib/db";
import { updateSeoSettings } from "@/server/actions/admin/hotel";
import { updatePageMeta } from "@/server/actions/admin/content";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { AText, ATextArea } from "@/components/admin/Fields";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { AdminPageTitle, Panel } from "@/components/admin/ui";

export const metadata = { title: "SEO" };

const PATHS: Record<string, string> = {
  home: "/",
  rooms: "/rooms",
  jiri: "/jiri",
  "jiri-things-to-do": "/jiri/things-to-do",
  "jiri-how-to-reach": "/jiri/how-to-reach",
  gallery: "/gallery",
  location: "/location",
  contact: "/contact",
  booking: "/booking",
  faq: "/faq",
};

export default async function SeoPage() {
  const [seo, pages] = await Promise.all([
    prisma.sEOSettings.findUniqueOrThrow({ where: { id: "default" } }),
    prisma.page.findMany({ where: { slug: { in: Object.keys(PATHS) } }, select: { id: true, slug: true, title: true, metaTitle: true, metaDescription: true } }),
  ]);
  pages.sort((a, b) => Object.keys(PATHS).indexOf(a.slug) - Object.keys(PATHS).indexOf(b.slug));

  return (
    <>
      <AdminPageTitle
        title="SEO"
        description="How your pages appear in Google and when shared on social media. Write naturally for travellers — e.g. “hotel in Jiri Bazaar” — rather than repeating keywords."
      />

      <AdminForm action={updateSeoSettings} className="space-y-6">
        <Panel title="Site-wide defaults">
          <div className="grid gap-5">
            <AText label="Site title" name="siteTitle" defaultValue={seo.siteTitle} required />
            <AText label="Title template" name="titleTemplate" defaultValue={seo.titleTemplate} required hint="%s is replaced by each page title." />
            <ATextArea label="Default description" name="defaultDescription" defaultValue={seo.defaultDescription} required rows={3} maxLength={300} hint="About 150–160 characters works best." />
            <AText label="Google Search Console verification code" name="googleSiteVerification" defaultValue={seo.googleSiteVerification} optional hint="Only the content value of the google-site-verification meta tag." />
            <ImageUploader label="Default social sharing image" currentUrl={seo.defaultOgImageUrl} hint="Shown when your site is shared on Facebook/WhatsApp. Ideal size 1200 × 630." />
          </div>
          <div className="mt-5 flex justify-end">
            <SubmitButton>Save defaults</SubmitButton>
          </div>
        </Panel>
      </AdminForm>

      <h2 className="mt-10 mb-4 text-lg font-semibold text-forest-900">Page titles &amp; descriptions</h2>
      <p className="-mt-2 mb-4 text-sm text-muted">
        Room pages are edited under <Link href="/admin/rooms" className="underline">Rooms</Link>.
      </p>
      <div className="space-y-4">
        {pages.map((p) => (
          <details key={p.id} className="group rounded-lg border border-cream-200 bg-white">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
              <span>
                <span className="font-semibold text-forest-900">{p.title}</span>
                <span className="ml-2 text-xs text-muted">{PATHS[p.slug]}</span>
              </span>
              <span className="text-xs font-semibold text-clay-700 group-open:hidden">Edit</span>
            </summary>
            <AdminForm action={updatePageMeta} className="space-y-4 border-t border-cream-100 px-5 py-5">
              <input type="hidden" name="id" value={p.id} />
              <AText label="Meta title" name="metaTitle" defaultValue={p.metaTitle} maxLength={120} hint="Around 50–60 characters." />
              <ATextArea label="Meta description" name="metaDescription" defaultValue={p.metaDescription} rows={2} maxLength={300} hint="Around 150–160 characters." />
              <div className="flex justify-end">
                <SubmitButton>Save</SubmitButton>
              </div>
            </AdminForm>
          </details>
        ))}
      </div>
    </>
  );
}
