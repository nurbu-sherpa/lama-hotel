import type { ReactNode } from "react";

/**
 * Tiny, safe Markdown subset renderer → React elements (never raw HTML, so no XSS).
 *
 * Supported:
 *   ## Heading / ### Heading
 *   - bullet list items
 *   1. numbered list items
 *   **bold**, *italic*
 *   [link text](https://example.com)  — only http(s), mailto:, tel: and site-relative links
 *   Blank line = new paragraph.
 */

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Order matters: links, bold, italic.
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[1] !== undefined) {
      const href = m[2];
      if (SAFE_URL.test(href)) {
        const external = /^https?:\/\//i.test(href);
        out.push(
          <a
            key={key}
            href={href}
            className="font-medium text-forest-700 underline decoration-clay-400 underline-offset-2 hover:text-clay-600"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {m[1]}
          </a>,
        );
      } else {
        out.push(m[1]);
      }
    } else if (m[3] !== undefined) {
      out.push(<strong key={key}>{m[3]}</strong>);
    } else if (m[4] !== undefined) {
      out.push(<em key={key}>{m[4]}</em>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  const nodes: ReactNode[] = [];

  blocks.forEach((block, bi) => {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) return;

    const h = /^(#{2,3})\s+(.*)$/.exec(lines[0]);
    if (h && lines.length === 1) {
      const Tag = h[1].length === 2 ? "h3" : "h4";
      nodes.push(
        <Tag key={bi} className="mt-6 font-display text-xl text-forest-900">
          {renderInline(h[2], `h${bi}`)}
        </Tag>,
      );
      return;
    }

    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      nodes.push(
        <ul key={bi} className="list-disc space-y-1.5 pl-5 marker:text-clay-500">
          {lines.map((l, li) => (
            <li key={li}>{renderInline(l.replace(/^\s*[-*]\s+/, ""), `u${bi}-${li}`)}</li>
          ))}
        </ul>,
      );
      return;
    }

    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      nodes.push(
        <ol key={bi} className="list-decimal space-y-1.5 pl-5 marker:text-clay-600">
          {lines.map((l, li) => (
            <li key={li}>{renderInline(l.replace(/^\s*\d+[.)]\s+/, ""), `o${bi}-${li}`)}</li>
          ))}
        </ol>,
      );
      return;
    }

    nodes.push(
      <p key={bi}>
        {lines.map((l, li) => (
          <span key={li}>
            {li > 0 && <br />}
            {renderInline(l, `p${bi}-${li}`)}
          </span>
        ))}
      </p>,
    );
  });

  return <div className={className ?? "prose-lodge"}>{nodes}</div>;
}

/** Plain-text version (for meta descriptions / JSON-LD). */
export function markdownToPlain(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
