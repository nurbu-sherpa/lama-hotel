"use client";

import { useId, useRef, useState } from "react";
import { Bold, Heading2, Italic, Link2, List, ListOrdered } from "lucide-react";
import { Markdown } from "@/lib/markdown";
import { useFieldErrors } from "./AdminForm";
import { cn } from "@/lib/utils/format";

const TOOLS = [
  { id: "bold", label: "Bold", Icon: Bold },
  { id: "italic", label: "Italic", Icon: Italic },
  { id: "heading", label: "Heading", Icon: Heading2 },
  { id: "bullets", label: "Bullet list", Icon: List },
  { id: "numbers", label: "Numbered list", Icon: ListOrdered },
  { id: "link", label: "Link", Icon: Link2 },
] as const;
type ToolId = (typeof TOOLS)[number]["id"];

/**
 * Simple, owner-friendly text editor. Stores a tiny safe Markdown subset
 * (bold, italic, headings, lists, links) that is rendered without raw HTML — no XSS risk.
 */
export function RichTextEditor({ name, label, defaultValue = "", rows = 8, hint, required }: { name: string; label: string; defaultValue?: string; rows?: number; hint?: string; required?: boolean }) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const error = useFieldErrors()[name];

  function wrap(before: string, after = before, placeholder = "text") {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const selected = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    setValue(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  }

  function prefixLines(prefix: (i: number) => string) {
    const ta = ref.current;
    if (!ta) return;
    const start = value.lastIndexOf("\n", ta.selectionStart - 1) + 1;
    const end = ta.selectionEnd;
    const block = value.slice(start, end) || "Item";
    const lines = block.split("\n").map((l, i) => prefix(i) + l.replace(/^(\s*[-*]\s+|\s*\d+[.)]\s+|#{2,3}\s+)/, ""));
    setValue(value.slice(0, start) + lines.join("\n") + value.slice(end));
    requestAnimationFrame(() => ta.focus());
  }

  function runTool(tool: ToolId) {
    if (tool === "bold") wrap("**");
    else if (tool === "italic") wrap("*");
    else if (tool === "heading") prefixLines(() => "## ");
    else if (tool === "bullets") prefixLines(() => "- ");
    else if (tool === "numbers") prefixLines((i) => `${i + 1}. `);
    else if (tool === "link") {
      const url = window.prompt("Link address (https://…)", "https://");
      if (url && /^(https?:\/\/|mailto:|tel:|\/)/.test(url)) wrap("[", `](${url})`, "link text");
    }
  }

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className={cn("overflow-hidden rounded-xl border bg-white", error ? "border-red-500" : "border-cream-300")}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-200 bg-cream-50 px-2 py-1.5">
          <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5">
            {TOOLS.map(({ id: tool, label: l, Icon }) => (
              <button key={l} type="button" onClick={() => runTool(tool)} disabled={tab === "preview"} title={l} aria-label={l} className="rounded-md p-2 text-ink/70 hover:bg-cream-200 hover:text-ink disabled:opacity-40">
                <Icon size={16} aria-hidden />
              </button>
            ))}
          </div>
          <div className="flex rounded-lg bg-cream-200 p-0.5 text-xs font-semibold" role="tablist">
            {(["write", "preview"] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-md px-3 py-1 capitalize", tab === t ? "bg-white shadow-sm" : "text-muted")}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <textarea
          ref={ref}
          id={id}
          name={name}
          rows={rows}
          required={required}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={cn("block w-full resize-y px-3.5 py-3 text-sm leading-relaxed outline-none", tab === "preview" && "hidden")}
        />
        {tab === "preview" && (
          <div className="min-h-32 px-4 py-3">{value.trim() ? <Markdown text={value} className="space-y-3 text-sm leading-relaxed" /> : <p className="text-sm text-muted">Nothing to preview.</p>}</div>
        )}
      </div>
      {error ? (
        <p className="field-error" role="alert">
          {error[0]}
        </p>
      ) : (
        <p className="field-hint">{hint ?? "Leave a blank line between paragraphs. Use the buttons above for bold text, headings, lists and links."}</p>
      )}
    </div>
  );
}
