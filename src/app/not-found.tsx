import Link from "next/link";
import { LogoMark } from "@/components/public/Logo";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="max-w-md text-center">
        <LogoMark className="mx-auto h-14 w-14" />
        <p className="eyebrow mt-8">Error 404</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-forest-900">This page wandered off the trail</h1>
        <p className="mt-4 text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            Go to homepage
          </Link>
          <Link href="/rooms" className="btn-outline">
            View rooms
          </Link>
          <Link href="/contact" className="btn-outline">
            Contact us
          </Link>
        </div>
      </div>
    </main>
  );
}
