"use client";

import { useState, useTransition } from "react";
import { Copy, RefreshCw, Sparkles } from "lucide-react";
import { draftInquiryReply, draftMessageReply } from "@/server/actions/admin/ai-drafts";
import { TextAreaField } from "@/components/ui/Field";
import { useToast } from "./ToastProvider";

/** "Draft reply with AI" — the owner edits, copies and sends it themselves. Nothing is sent automatically. */
export function AiDraftReply({ kind, id }: { kind: "inquiry" | "message"; id: string }) {
  const showToast = useToast();
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const generate = () =>
    startTransition(async () => {
      try {
        const r = await (kind === "inquiry" ? draftInquiryReply : draftMessageReply)(id);
        if (r.ok) setDraft(r.draft);
        else showToast?.({ ok: false, message: r.message });
      } catch {
        showToast?.({ ok: false, message: "Could not reach the server. Please try again." });
      }
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft ?? "");
      showToast?.({ ok: true, message: "Copied — paste it into email or WhatsApp." });
    } catch {
      showToast?.({ ok: false, message: "Copy failed — select the text and copy it manually." });
    }
  };

  if (draft === null) {
    return (
      <button type="button" onClick={generate} disabled={pending} className="btn-outline btn-sm">
        <Sparkles size={16} aria-hidden /> {pending ? "Drafting…" : "Draft reply with AI"}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <TextAreaField
        label="AI draft — check and edit before sending"
        name="aiDraft"
        rows={10}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={pending}
        hint="Nothing is sent automatically. Copy it into email or WhatsApp yourself."
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} disabled={pending || !draft} className="btn-dark btn-sm">
          <Copy size={16} aria-hidden /> Copy
        </button>
        <button type="button" onClick={generate} disabled={pending} className="btn-outline btn-sm">
          <RefreshCw size={16} aria-hidden className={pending ? "animate-spin motion-reduce:animate-none" : undefined} /> {pending ? "Drafting…" : "Regenerate"}
        </button>
      </div>
    </div>
  );
}
