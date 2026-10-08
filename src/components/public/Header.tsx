import Link from "next/link";
import { Phone } from "lucide-react";
import { getHotel } from "@/lib/data/public";
import { formatPhoneIntl, telHref, whatsappHref } from "@/lib/utils/format";
import { publicNav } from "@/config/site";
import { NavLinks } from "./NavLinks";
import { MobileNav } from "./MobileNav";
import { Logo } from "./Logo";

export async function Header() {
  const hotel = await getHotel();
  return (
    <header className="site-header sticky top-0 z-40 border-b border-cream-200 bg-cream-50/95 backdrop-blur-sm" style={{ viewTransitionName: "site-header" }}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-forest-900 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-[4.5rem]">
        <Logo name={hotel.name} />

        <nav aria-label="Main" className="hidden lg:block">
          <NavLinks items={[...publicNav]} />
        </nav>

        <div className="flex items-center gap-1 sm:gap-3">
          <a
            href={telHref(hotel.phone)}
            className="hidden min-h-11 items-center gap-2 px-2 text-[0.95rem] font-medium text-forest-800 hover:text-clay-700 xl:inline-flex"
          >
            <Phone size={16} aria-hidden />
            {formatPhoneIntl(hotel.phone)}
          </a>
          <Link href="/booking" prefetch className="btn-primary hidden !min-h-10 !px-4 sm:inline-flex">
            Check Availability
          </Link>
          <MobileNav
            items={[...publicNav, { href: "/booking", label: "Booking" }]}
            phoneHref={telHref(hotel.phone)}
            phoneLabel={formatPhoneIntl(hotel.phone)}
            whatsappHref={whatsappHref(hotel.whatsapp)}
          />
        </div>
      </div>
    </header>
  );
}
