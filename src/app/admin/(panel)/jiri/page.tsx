import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { AdminPageTitle } from "@/components/admin/ui";

export const metadata = { title: "Jiri Guide" };

const GUIDE = [
  { slug: "jiri", path: "/jiri" },
  { slug: "jiri-things-to-do", path: "/jiri/things-to-do" },
  { slug: "jiri-how-to-reach", path: "/jiri/how-to-reach" },
];

export default async function JiriGuideAdmin() {
  const pages = await prisma.page.findMany({ where: { slug: { in: GUIDE.map((g) => g.slug) } }, include: { _count: { select: { sections: true } } } });
  return (
    <>
      <AdminPageTitle
        title="Jiri Guide"
        description="Travel information about Jiri. Keep changing facts (bus times, fares, road conditions) general, or update them here whenever they change."
      />
      <ul className="space-y-3">
        {GUIDE.map((g) => {
          const p = pages.find((x) => x.slug === g.slug);
          if (!p) return null;
          return (
            <li key={g.slug}>
              <Link href={`/admin/jiri/${g.slug}`} className="flex items-center justify-between gap-4 rounded-lg border border-cream-200 bg-white p-5 hover:border-forest-300">
                <div>
                  <p className="font-semibold text-forest-900">{p.title}</p>
                  <p className="text-sm text-muted">
                    {g.path} · {p._count.sections} sections
                  </p>
                </div>
                <ArrowRight size={18} className="text-clay-600" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
