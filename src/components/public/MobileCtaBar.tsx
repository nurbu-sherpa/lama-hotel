import Link from "next/link";
import { CalendarCheck, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/shared/icons";
import { getHotel } from "@/lib/data/public";
import { telHref, whatsappHref } from "@/lib/utils/format";

/** Sticky booking/contact bar on small screens. */
export async function MobileCtaBar() {
  const hotel = await getHotel();
  const item = "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.72rem] font-semibold";
  return (
    <nav
      aria-label="Quick contact"
      style={{ viewTransitionName: "mobile-cta" }}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-cream-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-10px_rgba(0,0,0,0.2)] backdrop-blur lg:hidden"
    >
      <div className="flex">
        <a href={telHref(hotel.phone)} className={`${item} text-forest-800`}>
          <Phone size={20} aria-hidden />
          Call
        </a>
        <a href={whatsappHref(hotel.whatsapp)} target="_blank" rel="noopener noreferrer" className={`${item} text-forest-800`}>
          <WhatsAppIcon size={20} />
          WhatsApp
        </a>
        <Link href="/booking" prefetch className={`${item} m-1.5 rounded-lg bg-linear-to-b from-clay-600 to-clay-700 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_4px_12px_-6px_rgb(161_98_7/0.7)] transition-[scale,box-shadow] duration-150 active:scale-[0.96] active:from-clay-700 active:shadow-[inset_0_3px_8px_rgb(0_0_0/0.3)] active:duration-75`}>
          <CalendarCheck size={20} aria-hidden />
          Check Availability
        </Link>
      </div>
    </nav>
  );
}
