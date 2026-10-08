import { buildMetadata } from "@/lib/seo";
import { GuidePage } from "@/components/public/GuidePage";

export function generateMetadata() {
  return buildMetadata({ path: "/jiri/how-to-reach", pageSlug: "jiri-how-to-reach", title: "How to Reach Jiri" });
}

export default function HowToReachPage() {
  return (
    <GuidePage
      slug="jiri-how-to-reach"
      crumbs={[
        { name: "Jiri", path: "/jiri" },
        { name: "How to Reach", path: "/jiri/how-to-reach" },
      ]}
    />
  );
}
