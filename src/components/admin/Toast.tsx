"use client";

import { useEffect } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/format";

export function Toast({ ok, message, onDone }: { ok: boolean; message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, ok ? 3500 : 7000);
    return () => clearTimeout(t);
  }, [ok, onDone]);

  if (!message) return null;
  return (
    <div
      role={ok ? "status" : "alert"}
      aria-live={ok ? "polite" : "assertive"}
      className={cn(
        "fixed right-4 bottom-4 left-4 z-[60] flex animate-fade-up items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-lg sm:left-auto sm:max-w-sm",
        ok ? "bg-forest-800 text-white" : "bg-red-700 text-white",
      )}
    >
      {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden /> : <XCircle size={18} className="mt-0.5 shrink-0" aria-hidden />}
      <p className="flex-1">{message}</p>
      <button type="button" onClick={onDone} aria-label="Dismiss" className="shrink-0 opacity-80 hover:opacity-100">
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
