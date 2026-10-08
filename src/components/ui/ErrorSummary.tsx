import type { Ref } from "react";
import { AlertCircle } from "lucide-react";

/**
 * Focusable error summary shown after a failed submit. Each item links to its field
 * (inputs use id="f-<name>"), and the inline field errors remain in place.
 */
export function ErrorSummary({
  message,
  errors,
  labels,
  ref,
}: {
  message: string;
  errors: Record<string, string[] | undefined>;
  labels: Record<string, string>;
  ref?: Ref<HTMLDivElement>;
}) {
  const items = Object.entries(errors).filter(([, v]) => v?.length);
  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-labelledby="error-summary-title" className="rounded-md border border-red-200 border-l-4 border-l-red-600 bg-red-50 px-4 py-4 outline-none">
      <p id="error-summary-title" className="flex items-center gap-2 font-semibold text-red-900">
        <AlertCircle size={18} aria-hidden className="shrink-0" />
        {message}
      </p>
      {items.length > 0 && (
        <ul className="mt-2 space-y-1 pl-7 text-[0.95rem]">
          {items.map(([name, msgs]) => (
            <li key={name}>
              <a href={`#f-${name}`} className="text-red-800 underline underline-offset-2 hover:text-red-950">
                {labels[name] ? `${labels[name]}: ` : ""}
                {msgs![0]}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
