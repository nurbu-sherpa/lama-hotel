import Link from "next/link";
import { LogoMark } from "@/components/public/Logo";
import CloudSky from "@/components/shared/CloudSky";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main id="main" className="relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-24">
      <CloudSky className="-z-10" style={{ position: "absolute", inset: 0 }} />
      <div className="w-full max-w-lg rounded-2xl px-6 py-10 text-center shadow-[0_24px_60px_-20px_rgb(14_26_49/0.45)] ring-1 ring-white/70 backdrop-blur-md sm:px-10">
        <LogoMark className="mx-auto h-12 w-12" />
        <p className="mt-6 font-display text-7xl leading-none font-semibold tracking-tight text-white sm:text-8xl">404</p>
        <p className="eyebrow text-white mt-4">Page not found</p>
        <h1 className="mt-3 font-display text-3xl leading-tight font-semibold text-forest-900 sm:text-4xl">
          This page wandered off into the clouds
        </h1>
        <p className="mt-4 text-ink/80">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            Go to homepage
          </Link>
          <Link href="/rooms" className="btn-outline ">
            View rooms
          </Link>
          <Link href="/contact" className="btn-outline ">
            Contact us
          </Link>
        </div>
      </div>
    </main>
  );
}
