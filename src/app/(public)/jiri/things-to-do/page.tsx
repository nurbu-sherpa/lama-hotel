import { buildMetadata } from "@/lib/seo";
import { GuidePage } from "@/components/public/GuidePage";

export function generateMetadata() {
  return buildMetadata({ path: "/jiri/things-to-do", pageSlug: "jiri-things-to-do", title: "Things to Do in Jiri" });
}

export default function ThingsToDoPage() {
  return (
    <GuidePage
      slug="jiri-things-to-do"
      crumbs={[
        { name: "Jiri", path: "/jiri" },
        { name: "Things to Do", path: "/jiri/things-to-do" },
      ]}
    />
  );
}
