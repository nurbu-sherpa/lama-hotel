import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";
import { getRooms } from "@/lib/data/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rooms = await getRooms();
  const now = new Date();
  const staticRoutes: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["/", 1, "weekly"],
    ["/rooms", 0.9, "weekly"],
    ["/booking", 0.8, "monthly"],
    ["/location", 0.8, "monthly"],
    ["/contact", 0.7, "monthly"],
    ["/jiri", 0.7, "monthly"],
    ["/jiri/things-to-do", 0.6, "monthly"],
    ["/jiri/how-to-reach", 0.6, "monthly"],
    ["/gallery", 0.6, "monthly"],
    ["/faq", 0.5, "monthly"],
    ["/privacy", 0.2, "yearly"],
    ["/terms", 0.2, "yearly"],
  ];
  return [
    ...staticRoutes.map(([path, priority, changeFrequency]) => ({ url: `${siteUrl}${path === "/" ? "" : path}` || siteUrl, lastModified: now, changeFrequency, priority })),
    ...rooms.map((r) => ({ url: `${siteUrl}/rooms/${r.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
