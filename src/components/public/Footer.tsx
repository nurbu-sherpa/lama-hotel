import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { getHotel, getPage, section } from "@/lib/data/public";
import { footerNav } from "@/config/site";
import { formatPhoneIntl, formatTime, mailtoHref, telHref, whatsappHref } from "@/lib/utils/format";
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon, YouTubeIcon } from "@/components/shared/icons";
import { LogoMark } from "./Logo";

export async function Footer() {
  const [hotel, home] = await Promise.all([getHotel(), getPage("home")]);
  const footerText = section(home, "footer").body || hotel.description;

  // Only render social links that the owner has actually configured.
  const socials = [
    { url: hotel.facebookUrl, label: "Facebook", Icon: FacebookIcon },
    { url: hotel.instagramUrl, label: "Instagram", Icon: InstagramIcon },
    { url: hotel.tiktokUrl, label: "TikTok", Icon: TikTokIcon },
    { url: hotel.youtubeUrl, label: "YouTube", Icon: YouTubeIcon },
  ].filter((s) => s.url);

  return (
    <footer className="bg-forest-950 pb-24 text-cream-200 lg:pb-0">
      <div className="container-page grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <p className="font-display text-xl font-semibold text-white">{hotel.name}</p>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream-200/80">{footerText}</p>
          {socials.length > 0 && (
            <ul className="mt-6 flex gap-2" aria-label="Social media">
              {socials.map(({ url, label, Icon }) => (
                <li key={label}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${hotel.name} on ${label}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-cream-100 hover:bg-white/10"
                  >
                    <Icon size={18} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="md:col-span-4">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-clay-300 uppercase">Contact</h2>
          <address className="mt-4 space-y-3 text-sm not-italic">
            <p className="flex gap-3">
              <MapPin size={18} className="mt-0.5 shrink-0 text-clay-300" aria-hidden />
              <span>
                {hotel.address}
                {hotel.locationDescription && <span className="block text-cream-200/70">{hotel.locationDescription}</span>}
              </span>
            </p>
            <p>
              <a href={telHref(hotel.phone)} className="flex gap-3 hover:text-white">
                <Phone size={18} className="shrink-0 text-clay-300" aria-hidden />
                {formatPhoneIntl(hotel.phone)}
              </a>
            </p>
            <p>
              <a href={whatsappHref(hotel.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex gap-3 hover:text-white">
                <WhatsAppIcon size={18} className="shrink-0 text-clay-300" />
                WhatsApp {formatPhoneIntl(hotel.whatsapp)}
              </a>
            </p>
            <p>
              <a href={mailtoHref(hotel.email)} className="flex gap-3 break-all hover:text-white">
                <Mail size={18} className="shrink-0 text-clay-300" aria-hidden />
                {hotel.email}
              </a>
            </p>
          </address>
          <p className="mt-5 text-sm text-cream-200/70">
            Check-in {formatTime(hotel.checkInTime)} · Check-out {formatTime(hotel.checkOutTime)}
          </p>
        </div>

        <nav aria-label="Footer" className="md:col-span-3">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-clay-300 uppercase">Explore</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 text-[0.95rem] md:grid-cols-1">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-10 min-w-6 items-center hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-cream-200/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {hotel.name}, {hotel.city}, {hotel.country}
          </p>
          <p className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
