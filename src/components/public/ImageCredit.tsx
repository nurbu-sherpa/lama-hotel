import { cn } from "@/lib/utils/format";

/** Small photo caption/credit overlay. Used to label destination imagery honestly (e.g. "Jiri, Nepal"). */
export function ImageCredit({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <p className={cn("max-w-[80%] rounded bg-black/45 px-2 py-0.5 text-right text-[0.68rem] leading-snug text-white/85", className)}>
      {text}
    </p>
  );
}
