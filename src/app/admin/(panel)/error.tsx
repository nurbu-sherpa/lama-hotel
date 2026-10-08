"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/** Admin error state: a calm message with recovery actions, never a stack trace. */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-lg border border-red-200 bg-white p-8 text-center">
      <AlertTriangle size={32} className="mx-auto text-red-700" aria-hidden />
      <h1 className="mt-4 font-display text-2xl font-medium text-forest-900">This page couldn&apos;t be loaded</h1>
      <p className="mt-2 text-muted">Your data is safe. Please try again — if it keeps happening, check the database connection.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-dark">
          Try again
        </button>
        <Link href="/admin/dashboard" className="btn-outline">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
