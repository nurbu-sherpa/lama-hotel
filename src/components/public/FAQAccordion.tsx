import { Plus } from "lucide-react";
import { Markdown } from "@/lib/markdown";

/**
 * Native <details> accordion — keyboard and screen-reader accessible with no JavaScript.
 * Opening/closing animates smoothly in supporting browsers (see globals.css) and respects reduced motion.
 */
export function FAQAccordion({ faqs }: { faqs: { id: string; question: string; answer: string }[] }) {
  return (
    <div className="border-t border-cream-300/80">
      {faqs.map((f) => (
        <details key={f.id} className="group border-b border-cream-300/80">
          <summary className="flex min-h-14 list-none items-center justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
            <h3 className="font-display text-[1.2rem] leading-snug font-medium text-forest-900 group-hover:text-clay-700 sm:text-[1.3rem]">{f.question}</h3>
            <Plus size={20} aria-hidden className="shrink-0 text-clay-600 transition-transform duration-200 group-open:rotate-45" />
          </summary>
          <div className="pr-10 pb-6">
            <Markdown text={f.answer} className="max-w-[65ch] space-y-3 text-[1.05rem] leading-relaxed text-ink/80" />
          </div>
        </details>
      ))}
    </div>
  );
}
