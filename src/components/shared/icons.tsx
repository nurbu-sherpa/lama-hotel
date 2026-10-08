import type { SVGProps } from "react";
import {
  Bath,
  BedDouble,
  Car,
  Check,
  Clock,
  Coffee,
  Droplets,
  Flame,
  KeyRound,
  Leaf,
  Luggage,
  Mountain,
  Plug,
  Shirt,
  ShowerHead,
  Snowflake,
  SquareParking,
  Sun,
  Tv,
  Users,
  UtensilsCrossed,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };
}

export function WhatsAppIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function YouTubeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

export function TikTokIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 7.917v4.034a9.948 9.948 0 0 1-5-1.951v4.5a6.5 6.5 0 1 1-8-6.326v4.326a2.5 2.5 0 1 0 4 2V3h4.083A6.005 6.005 0 0 0 21 7.917z" />
    </svg>
  );
}

/** Icons the owner can choose for facilities (Admin → Facilities). */
export const FACILITY_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  check: { label: "Check mark", Icon: Check },
  shower: { label: "Shower", Icon: ShowerHead },
  wifi: { label: "Wi-Fi", Icon: Wifi },
  bed: { label: "Bed", Icon: BedDouble },
  bath: { label: "Bathroom", Icon: Bath },
  water: { label: "Water", Icon: Droplets },
  parking: { label: "Parking", Icon: SquareParking },
  food: { label: "Food / restaurant", Icon: UtensilsCrossed },
  coffee: { label: "Tea / coffee", Icon: Coffee },
  car: { label: "Transport", Icon: Car },
  heating: { label: "Heating / fire", Icon: Flame },
  tv: { label: "Television", Icon: Tv },
  luggage: { label: "Luggage", Icon: Luggage },
  laundry: { label: "Laundry", Icon: Shirt },
  clock: { label: "24 hours / time", Icon: Clock },
  power: { label: "Power / charging", Icon: Plug },
  electricity: { label: "Electricity / backup", Icon: Zap },
  mountain: { label: "Mountain view", Icon: Mountain },
  garden: { label: "Garden / nature", Icon: Leaf },
  sun: { label: "Sun / terrace", Icon: Sun },
  winter: { label: "Winter / warm", Icon: Snowflake },
  key: { label: "Key / security", Icon: KeyRound },
  group: { label: "Groups / family", Icon: Users },
};

export function FacilityIcon({ name, className, size = 22 }: { name: string; className?: string; size?: number }) {
  const Icon = FACILITY_ICONS[name]?.Icon ?? Check;
  return <Icon className={className} size={size} aria-hidden strokeWidth={1.8} />;
}
