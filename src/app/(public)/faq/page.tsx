import { getFaqsResolved, getHotel } from "@/lib/data/public";
import { buildMetadata, faqJsonLd, JsonLd } from "@/lib/seo";
import { markdownToPlain } from "@/lib/markdown";
import { PageHeader } from "@/components/public/PageHeader";
import { FAQAccordion } from "@/components/public/FAQAccordion";
import { CTASection } from "@/components/public/CTASection";

export function generateMetadata() {
  return buildMetadata({ path: "/faq", pageSlug: "faq", title: "Frequently Asked Questions" });
}

export default async function FaqPage() {
  const [faqs, hotel] = await Promise.all([getFaqsResolved(), getHotel()]);
  return (
    <>
      {faqs.length > 0 && <JsonLd data={faqJsonLd(faqs.map((f) => ({ question: f.question, answer: markdownToPlain(f.answer) })))} />}
      <PageHeader eyebrow="FAQ" title="Frequently asked questions" crumbs={[{ name: "FAQ", path: "/faq" }]} />
      <section className="container-page max-w-3xl py-12 sm:py-16">
        {faqs.length > 0 ? <FAQAccordion faqs={faqs} /> : <p className="text-muted">No questions yet.</p>}
      </section>
      <CTASection hotel={hotel} heading="Still have a question?" body="Call, WhatsApp or email us — we're happy to help." />
    </>
  );
}
