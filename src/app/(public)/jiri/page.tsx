import { buildMetadata } from "@/lib/seo";
import { GuidePage } from "@/components/public/GuidePage";

export function generateMetadata() {
  return buildMetadata({ path: "/jiri", pageSlug: "jiri", title: "About Jiri, Nepal" });
}

export default function JiriPage() {
  return <GuidePage slug="jiri" crumbs={[{ name: "Jiri", path: "/jiri" }]} />;
}
