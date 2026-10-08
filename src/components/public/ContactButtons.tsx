import { Mail, Navigation, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/shared/icons";
import type { Hotel } from "@/lib/data/public";
import { cn, mailtoHref, telHref, whatsappHref } from "@/lib/utils/format";

type Kind = "call" | "whatsapp" | "email" | "directions";

/** Consistent Call / WhatsApp / Email / Get Directions buttons, all driven by hotel settings. */
export function ContactButtons({
  hotel,
  show = ["call", "whatsapp", "directions"],
  variant = "light",
  className,
}: {
  hotel: Hotel;
  show?: Kind[];
  variant?: "light" | "dark";
  className?: string;
}) {
  const style = variant === "dark" ? "btn-ghost-light" : "btn-outline";
  const buttons: Record<Kind, React.ReactNode> = {
    call: (
      <a key="call" href={telHref(hotel.phone)} className={style}>
        <Phone size={17} aria-hidden /> Call Us
      </a>
    ),
    whatsapp: (
      <a key="whatsapp" href={whatsappHref(hotel.whatsapp)} target="_blank" rel="noopener noreferrer" className={style}>
        <WhatsAppIcon size={17} /> WhatsApp
      </a>
    ),
    email: (
      <a key="email" href={mailtoHref(hotel.email, `Inquiry — ${hotel.name}`)} className={style}>
        <Mail size={17} aria-hidden /> Email
      </a>
    ),
    directions: (
      <a key="directions" href={hotel.googleMapsUrl} target="_blank" rel="noopener noreferrer" className={style}>
        <Navigation size={17} aria-hidden /> Get Directions
      </a>
    ),
  };
  return <div className={cn("flex flex-wrap gap-3", className)}>{show.map((k) => buttons[k])}</div>;
}
