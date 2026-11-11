import { getFaqsResolved, getHotel } from "@/lib/data/public";
import { buildMetadata, faqJsonLd, JsonLd } from "@/lib/seo";
import { markdownToPlain } from "@/lib/markdown";
import { PageHeader } from "@/components/public/PageHeader";
import { FAQAccordion } from "@/components/public/FAQAccordion";
import { CTASection } from "@/components/public/CTASection";
import { MessageCircle } from "lucide-react";
import { isAiEnabled } from "@/lib/ai/client";
import { AskButton } from "@/components/public/ChatWidget";

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
        {isAiEnabled() && (
          <div className="mt-10 flex flex-col items-start gap-3 rounded-xl border border-cream-200 bg-cream-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-forest-900">Didn&apos;t find your answer?</p>
            <AskButton className="btn-dark btn-sm">
              <MessageCircle size={16} aria-hidden /> Ask our assistant
            </AskButton>
          </div>
        )}
      </section>
      <CTASection hotel={hotel} heading="Still have a question?" body="Call, WhatsApp or email us — we're happy to help." />
    </>
  );
}
