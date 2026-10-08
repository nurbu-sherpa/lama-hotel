"use client";

import Link from "next/link";

/** Friendly error page — never exposes stack traces or internal messages to visitors. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="max-w-md text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-forest-900">Sorry — please try again</h1>
        <p className="mt-4 text-muted">We couldn&apos;t load this page. If the problem continues, please call or WhatsApp us.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-outline">
            Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
