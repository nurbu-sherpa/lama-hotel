"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { CheckCircle2, Pencil, Phone, RotateCcw, Send, X } from "lucide-react";
import { LogoMark } from "./Logo";
import { WhatsAppIcon } from "@/components/shared/icons";
import { Turnstile } from "@/components/forms/Turnstile";
import { redactContacts, restoreContacts, type ChatMessage } from "@/lib/ai/redact";
import { DRAFT_SEPARATOR, type InquiryDraft } from "@/lib/ai/chat-shared";
import { cn, telHref, whatsappHref } from "@/lib/utils/format";

type Draft = InquiryDraft & { state: "open" | "sending" | "sent" | "replaced" };
type Bubble = ChatMessage & { error?: boolean; draft?: Draft };

const HISTORY_KEY = "lh-chat-history"; // sessionStorage: survives page navigation, cleared when the tab closes
const KEEP = 60; // bubbles kept in sessionStorage
const WINDOW = 16; // latest messages sent with each question (server accepts up to 20) — the chat itself never stops
const MAX_CHARS = 1000;
const TURNSTILE_ON = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
const SENT = "✓ Request sent. The owner will contact you to confirm — this is not a confirmed booking yet.";

function starters(pathname: string) {
  if (pathname.startsWith("/rooms/")) return ["Is this room available on my dates?", "How many people fit in this room?", "What's included?"];
  if (pathname === "/booking") return ["Help me choose a room", "What is your cancellation policy?"];
  if (pathname === "/jiri/how-to-reach") return ["How long is the bus from Kathmandu?", "Can you help arrange transport?"];
  return ["Is a room available this weekend?", "How do I get to Jiri from Kathmandu?", "What facilities do you have?", "What can I do in Jiri?"];
}

const ERRORS: Record<string, string> = {
  verify: "Please complete the quick security check below, then send your message again.",
  rate_limited: "You've sent a lot of messages — please wait a few minutes, or call / WhatsApp us.",
  too_long: "That's a bit long for me. Please shorten your message, or start a new chat.",
  expired: "This request card has expired. Please ask me to prepare it again.",
};
const UNAVAILABLE = "Sorry, our assistant isn't available right now. Please call or WhatsApp us — we're happy to help.";

/** Assistant text: plain text with [label](/internal-path) links only. */
function Rich({ text }: { text: string }) {
  const parts = text.replace(/\*\*/g, "").split(/(\[[^\]]+\]\(\/[^)\s]*\))/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\[([^\]]+)\]\((\/[^)\s]*)\)$/.exec(p);
        return m ? (
          <Link key={i} href={m[2]} className="font-semibold text-clay-700 underline underline-offset-2">
            {m[1]}
          </Link>
        ) : (
          p
        );
      })}
    </>
  );
}

const readHistory = (): Bubble[] => {
  try {
    const v = JSON.parse(sessionStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

/** The conversation as the AI sees it: no error/card bubbles, no empty replies, latest WINDOW messages, starting with the guest. */
function forModel(bubbles: Bubble[]): ChatMessage[] {
  const msgs = bubbles.filter((m) => !m.error && !m.draft && m.content.trim()).map(({ role, content }) => ({ role, content }));
  const recent = msgs.slice(-WINDOW);
  while (recent[0]?.role === "assistant") recent.shift();
  return recent;
}

function DraftCard({ draft, onConfirm, onChange }: { draft: Draft; onConfirm: () => void; onChange: () => void }) {
  const active = draft.state === "open" || draft.state === "sending";
  return (
    <div className={cn("w-full rounded-xl border bg-white p-3 text-sm shadow-sm", active ? "border-clay-400" : "border-cream-200 opacity-70")}>
      <p className="font-semibold text-forest-900">{draft.state === "sent" ? "Booking request sent" : "Please check your booking request"}</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {draft.summary.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="break-words text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {active && (
        <div className="mt-3 flex flex-col gap-2">
          <button type="button" onClick={onConfirm} disabled={draft.state === "sending"} className="btn-primary btn-sm">
            <CheckCircle2 size={16} aria-hidden /> {draft.state === "sending" ? "Sending…" : "Yes, send to the owner"}
          </button>
          <button type="button" onClick={onChange} disabled={draft.state === "sending"} className="btn-outline btn-sm">
            <Pencil size={16} aria-hidden /> Change something
          </button>
          <p className="text-xs text-muted">Nothing is sent until you press “Yes”. It&apos;s a request — the owner confirms the booking.</p>
        </div>
      )}
      {draft.state === "replaced" && <p className="mt-2 text-xs text-muted">Replaced by the updated request below.</p>}
    </div>
  );
}

export function ChatPanel(props: { open: boolean; onClose: () => void; prefill: { text: string } | null; pathname: string; name: string; phone: string; whatsapp: string }) {
  const { open, onClose, prefill, pathname } = props;
  const [messages, setMessages] = useState<Bubble[]>(readHistory);
  const [input, setInput] = useState(prefill?.text.slice(0, MAX_CHARS) ?? "");
  const [seenPrefill, setSeenPrefill] = useState(prefill);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(!TURNSTILE_ON);
  const [tsKey, setTsKey] = useState(0);
  const [announce, setAnnounce] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const tsRef = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [vv, setVv] = useState<{ h: number; top: number } | null>(null);

  // Guest's own emails/phones show as written; the server only ever sends placeholders to the model.
  const contacts = useMemo(() => redactContacts(forModel(messages)).values, [messages]);

  useEffect(() => {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages.filter((m) => !m.error).slice(-KEEP)));
    } catch {}
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  // A new "Ask" button click while the panel is mounted → put its question in the input.
  if (prefill !== seenPrefill) {
    setSeenPrefill(prefill);
    if (prefill) setInput(prefill.text.slice(0, MAX_CHARS));
  }

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, prefill]);

  // Phones: size the full-screen sheet to the visible area so the keyboard never covers the input.
  useEffect(() => {
    const v = window.visualViewport;
    if (!open || !v) return;
    const update = () => setVv(window.innerWidth < 1024 ? { h: v.height, top: v.offsetTop } : null);
    update();
    v.addEventListener("resize", update);
    v.addEventListener("scroll", update);
    return () => {
      v.removeEventListener("resize", update);
      v.removeEventListener("scroll", update);
    };
  }, [open]);

  const verifiedRef = useRef(verified);
  const setVerifiedBoth = (v: boolean) => {
    verifiedRef.current = v;
    setVerified(v);
  };
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const turnstileToken = async () => {
    if (verifiedRef.current) return undefined;
    const read = () => tsRef.current?.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value ?? "";
    for (let i = 0; i < 40 && !read(); i++) await sleep(250); // wait up to 10 s for the invisible check
    return read();
  };

  const errorOf = async (r: Response | null) => (!r ? "network" : r.ok ? undefined : (((await r.json().catch(() => ({}))) as { error?: string }).error ?? `http_${r.status}`));

  async function send(text: string) {
    const content = text.trim().slice(0, MAX_CHARS);
    if (!content || busy) return;
    const shown: Bubble[] = [...messages.filter((m) => !m.error), { role: "user", content }];
    const thinking = (note = "") => setMessages([...shown, { role: "assistant", content: note }]);
    thinking();
    setInput("");
    setBusy(true);
    const fail = (msg: string) => setMessages([...shown, { role: "assistant", content: msg, error: true }]);
    abort.current = new AbortController();
    const signal = abort.current.signal;
    const roomSlug = /^\/rooms\/([a-z0-9-]+)$/.exec(pathname)?.[1];
    const post = async () =>
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: forModel(shown), page: { path: pathname, roomSlug }, turnstileToken: await turnstileToken() }),
        signal,
      }).catch((err: Error) => {
        if (err.name === "AbortError") throw err;
        return null; // network hiccup → retried below
      });
    try {
      // Be patient before giving up: one retry after a short wait for busy/unreachable, and a fresh security token if needed.
      let res = await post();
      let error = await errorOf(res);
      if (error === "verify") {
        setVerifiedBoth(false);
        setTsKey((k) => k + 1);
        await sleep(300);
        res = await post();
        error = await errorOf(res);
      } else if (error === "network" || (res && res.status >= 500)) {
        thinking("Still thinking — one moment…");
        await sleep(3000);
        res = await post();
        error = await errorOf(res);
      }
      if (error || !res?.body) {
        console.warn(`[chat] request failed: ${res?.status ?? "network"} ${error ?? ""}`);
        if (error === "verify") {
          setVerifiedBoth(false);
          setTsKey((k) => k + 1);
        }
        fail(ERRORS[error ?? ""] ?? UNAVAILABLE);
        return;
      }
      setVerifiedBoth(true);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let raw = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += dec.decode(value, { stream: true });
        setMessages([...shown, { role: "assistant", content: raw.split(DRAFT_SEPARATOR)[0] }]);
      }
      // A booking card may follow the reply text (see /api/chat). A new card replaces any older open one.
      const [reply, draftJson] = raw.split(DRAFT_SEPARATOR);
      let draft: InquiryDraft | null = null;
      try {
        draft = draftJson ? (JSON.parse(draftJson) as InquiryDraft) : null;
      } catch {}
      const final: Bubble[] = draft ? shown.map((m) => (m.draft?.state === "open" ? { ...m, draft: { ...m.draft, state: "replaced" } } : m)) : shown;
      setMessages([
        ...final,
        ...(reply.trim() ? [{ role: "assistant" as const, content: reply }] : []),
        ...(draft ? [{ role: "assistant" as const, content: "", draft: { ...draft, state: "open" as const } }] : []),
      ]);
      setAnnounce(draft ? `${reply} Please check your booking request and press Yes to send it.` : reply);
    } catch (err) {
      if ((err as Error).name !== "AbortError") fail(UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }

  const setDraftState = (token: string, state: Draft["state"], after: Bubble[] = []) =>
    setMessages((prev) => [...prev.filter((m) => !m.error).map((m) => (m.draft?.token === token ? { ...m, draft: { ...m.draft, state } } : m)), ...after]);

  /** Only the guest's button press sends a booking request — the AI cannot. */
  async function confirmDraft(draft: Draft) {
    setDraftState(draft.token, "sending");
    const res = await fetch("/api/chat/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: draft.token }),
    }).catch(() => null);
    const error = await errorOf(res);
    if (!error) {
      setDraftState(draft.token, "sent", [{ role: "assistant", content: SENT }]);
      setAnnounce(SENT);
      return;
    }
    console.warn(`[chat] confirm failed: ${res?.status ?? "network"} ${error}`);
    setDraftState(draft.token, error === "expired" ? "replaced" : "open", [{ role: "assistant", content: ERRORS[error] ?? UNAVAILABLE, error: true }]);
  }

  const changeDraft = () => {
    setInput("I want to change something: ");
    inputRef.current?.focus();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  };
  const newChat = () => {
    abort.current?.abort();
    setMessages([]);
    setInput("");
    setAnnounce("");
    inputRef.current?.focus();
  };

  return (
    <div
      id="chat-panel"
      role="dialog"
      aria-label="Chat with Hotel Pine Valley assistant"
      hidden={!open}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      style={vv ? { height: vv.h, top: vv.top } : undefined}
      className={cn(
        "fixed inset-x-0 top-0 z-[60] flex h-dvh flex-col bg-white lg:inset-x-auto lg:top-auto lg:right-6 lg:bottom-24 lg:h-[min(600px,calc(100dvh-8rem))] lg:w-[380px] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-cream-200 lg:shadow-2xl",
        !open && "!hidden",
      )}
    >
      <header className="flex items-center gap-3 border-b border-cream-200 bg-forest-900 px-4 py-3 text-white">
        <LogoMark className="h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">{props.name}</p>
          <p className="text-xs text-cream-200">AI assistant · The owner confirms all bookings</p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={newChat} aria-label="Start new chat" title="Start new chat" className="btn-ghost-light btn-icon btn-sm">
            <RotateCcw size={18} aria-hidden />
          </button>
        )}
        <button type="button" onClick={onClose} aria-label="Close chat" className="btn-ghost-light btn-icon btn-sm">
          <X size={20} aria-hidden />
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-cream-50 px-4 py-4">
        {messages.length === 0 ? (
          <div>
            <p className="rounded-xl bg-white p-3 text-sm text-ink shadow-sm">
              Namaste! 🙏 I can answer questions about our rooms, facilities, booking and Jiri. The owner confirms every booking.
            </p>
            <p className="mt-4 mb-2 text-xs font-semibold text-muted">Try asking</p>
            <div className="flex flex-wrap gap-2">
              {starters(pathname).map((q) => (
                <button key={q} type="button" onClick={() => void send(q)} className="rounded-full border border-cream-300 bg-white px-3 py-2 text-left text-sm text-forest-900 hover:border-clay-400">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.draft ? (
              <DraftCard key={i} draft={m.draft} onConfirm={() => void confirmDraft(m.draft!)} onChange={changeDraft} />
            ) : (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <p
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    m.role === "user" ? "bg-forest-800 text-white" : "bg-white text-ink shadow-sm",
                    m.error && "border border-clay-300 bg-clay-50",
                  )}
                >
                  {m.content ? (
                    m.role === "user" ? m.content : <Rich text={restoreContacts(m.content, contacts)} />
                  ) : (
                    <span className="text-muted">Typing…</span>
                  )}
                </p>
              </div>
            ),
          )
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div className="border-t border-cream-200 bg-white px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mb-2 flex gap-2">
          <a href={telHref(props.phone)} className="btn-outline btn-sm flex-1 !min-h-9 text-xs">
            <Phone size={14} aria-hidden /> Call the lodge
          </a>
          <a href={whatsappHref(props.whatsapp)} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm flex-1 !min-h-9 text-xs">
            <WhatsAppIcon size={14} /> WhatsApp
          </a>
        </div>
        {!verified && (
          <div ref={tsRef}>
            <Turnstile appearance="interaction-only" resetKey={tsKey} />
          </div>
        )}
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Your question
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={MAX_CHARS}
            placeholder="Ask about rooms, booking or Jiri…"
            className="field-input max-h-32 min-h-11 flex-1 resize-none !text-base"
          />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="btn-primary btn-icon">
            <Send size={18} aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}
