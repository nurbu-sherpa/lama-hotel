import type { Metadata, Viewport } from "next";
import { Karla, Playfair_Display } from "next/font/google";
import { siteUrl } from "@/config/site";
import { getSeo } from "@/lib/data/public";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import "./globals.css";

// UI/UX Pro Max hospitality pairing: Playfair Display (headings) + Karla (body/UI).
const karla = Karla({ subsets: ["latin"], variable: "--font-karla", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo();
  return {
    metadataBase: new URL(siteUrl),
    title: { default: seo.siteTitle, template: seo.titleTemplate },
    description: seo.defaultDescription,
    applicationName: "Lama Hotel & Lodge",
    formatDetection: { telephone: true, email: true, address: false },
    ...(seo.googleSiteVerification ? { verification: { google: seo.googleSiteVerification } } : {}),
  };
}

export const viewport: Viewport = {
  themeColor: "#1e3460",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${karla.variable} ${playfair.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
        {children}
        <ScrollReveal />
      </body>
    </html>
  );
}
