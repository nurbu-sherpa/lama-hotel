import Link from "next/link";
import type { Hotel } from "@/lib/data/public";
import { ContactButtons } from "./ContactButtons";
import { RidgeLine } from "./RidgeLine";

/** Closing call to action — a full-width band that leads naturally into the footer. */
export function CTASection({ hotel, heading, body }: { hotel: Hotel; heading: string; body: string }) {
  return (
    <section aria-labelledby="cta-heading" className="relative isolate overflow-hidden bg-forest-900 text-white">
      <RidgeLine className="absolute inset-x-0 bottom-0 -z-10 h-28 w-full text-forest-950/70 sm:h-36" />
      <div className="container-page py-20 text-center sm:py-24">
        <h2 id="cta-heading" className="reveal mx-auto max-w-2xl font-display text-[2.1rem] leading-tight font-medium sm:text-5xl">
          {heading}
        </h2>
        {body && <p className="reveal mx-auto mt-5 max-w-xl text-lg leading-relaxed text-cream-100/85">{body}</p>}
        <div className="mt-9 flex flex-col items-center gap-5">
          <Link href="/booking" className="btn-primary !min-h-12 !px-8 text-base">
            Check Availability
          </Link>
          <ContactButtons hotel={hotel} variant="dark" className="justify-center" />
          <p className="text-sm text-cream-100/70">An inquiry is not a confirmed booking — we&apos;ll reply to confirm availability.</p>
        </div>
      </div>
    </section>
  );
}
