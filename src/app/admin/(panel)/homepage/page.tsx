import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { SectionEditor } from "@/components/admin/SectionEditor";
import { AdminPageTitle, Panel } from "@/components/admin/ui";

export const metadata = { title: "Homepage" };

/** Fixed homepage blocks (keys match the public homepage). */
const BLOCKS = [
  { key: "hero", title: "Hero (top of the page)", headingLabel: "Hero title", bodyLabel: "Tagline", bodyMode: "line", withImage: true },
  { key: "hero_subtitle", title: "Hero supporting text", hideHeading: true, bodyLabel: "Supporting text", bodyMode: "plain" },
  { key: "welcome", title: "Welcome section", headingLabel: "Welcome heading", bodyLabel: "Welcome text" },
  { key: "rooms_title", title: "Rooms section", headingLabel: "Section title", bodyLabel: "Intro line", bodyMode: "line" },
  { key: "facilities_title", title: "Facilities section", headingLabel: "Section title", bodyLabel: "Intro line (optional)", bodyMode: "line" },
  { key: "jiri", title: "Jiri section", headingLabel: "Jiri section title", bodyLabel: "Jiri description", withImage: true },
  { key: "cta", title: "Call to action (bottom)", headingLabel: "CTA heading", bodyLabel: "CTA text", bodyMode: "plain" },
  { key: "footer", title: "Footer", hideHeading: true, bodyLabel: "Footer text", bodyMode: "plain" },
] as const;

export default async function HomepageAdmin() {
  const page = await prisma.page.findUnique({ where: { slug: "home" }, include: { sections: true } });
  return (
    <>
      <AdminPageTitle
        title="Homepage"
        description="Edit the text and images on the homepage. Rooms, prices and facilities come from their own sections automatically."
        actions={
          <a href="/" target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cream-300 bg-white px-3 text-sm font-semibold hover:bg-cream-100">
            View homepage <ExternalLink size={14} aria-hidden />
          </a>
        }
      />
      {!page ? (
        <p className="text-muted">Homepage content is missing. Run the database seed (npm run db:seed).</p>
      ) : (
        <div className="space-y-6">
          {BLOCKS.map((b) => {
            const s = page.sections.find((x) => x.key === b.key);
            if (!s) return null;
            return (
              <Panel key={b.key} title={b.title}>
                <SectionEditor
                  section={s}
                  headingLabel={"headingLabel" in b ? b.headingLabel : undefined}
                  bodyLabel={b.bodyLabel}
                  bodyMode={"bodyMode" in b ? b.bodyMode : "rich"}
                  withImage={"withImage" in b ? b.withImage : false}
                  hideHeading={"hideHeading" in b ? b.hideHeading : false}
                />
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
