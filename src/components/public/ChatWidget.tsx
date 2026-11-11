"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils/format";

/**
 * Floating "Ask us" launcher for the AI assistant. Only this small button loads with the page;
 * the chat panel is fetched the first time a guest opens it. Rendered by the public layout only
 * when AI is enabled — admin and login pages never include it.
 */

const ChatPanel = dynamic(() => import("./ChatPanel").then((m) => m.ChatPanel), { ssr: false });

const OPEN_EVENT = "lh:open-chat";
const TIP_DISMISSED = "lh-chat-tip"; // localStorage: guest closed the tooltip → never again
const TIP_SHOWN = "lh-chat-tip-shown"; // sessionStorage: shown once per visit

/** Open the chat from anywhere, optionally with a question pre-filled in the input. */
export function openChat(question?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { question } }));
}

/** Button/link that opens the chat. Only render it when AI is enabled (pages check isAiEnabled()). */
export function AskButton({ children, question, className }: { children: ReactNode; question?: string; className?: string }) {
  return (
    <button type="button" onClick={() => openChat(question)} className={className}>
      {children}
    </button>
  );
}

const store = {
  get: (s: Storage | undefined, k: string) => {
    try {
      return s?.getItem(k);
    } catch {
      return null;
    }
  },
  set: (s: Storage | undefined, k: string) => {
    try {
      s?.setItem(k, "1");
    } catch {}
  },
};

export function ChatWidget({ name, phone, whatsapp }: { name: string; phone: string; whatsapp: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false); // keep the panel (and its chat) mounted once opened
  const [prefill, setPrefill] = useState<{ text: string } | null>(null);
  const [tip, setTip] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const onBooking = pathname === "/booking";

  const show = useCallback((question?: string) => {
    setLoaded(true);
    setOpen(true);
    setTip(false);
    if (question) setPrefill({ text: question });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    launcher.current?.focus();
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => show((e as CustomEvent<{ question?: string }>).detail?.question);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [show]);

  // Greeting tooltip: once per visit, a few seconds in, never on the booking form, never after it was closed.
  useEffect(() => {
    if (onBooking || open || store.get(localStorage, TIP_DISMISSED) || store.get(sessionStorage, TIP_SHOWN)) return;
    const t = setTimeout(() => {
      setTip(true);
      store.set(sessionStorage, TIP_SHOWN);
    }, 6000);
    return () => clearTimeout(t);
  }, [onBooking, open]);

  const dismissTip = () => {
    setTip(false);
    store.set(localStorage, TIP_DISMISSED);
  };

  return (
    <>
      {tip && !open && (
        <div
          role="status"
          className="fixed right-4 bottom-[calc(5.25rem+4.25rem+env(safe-area-inset-bottom))] z-30 flex max-w-[16rem] items-start gap-2 rounded-xl border border-cream-200 bg-white p-3 text-sm text-ink shadow-lg lg:right-6 lg:bottom-[5.75rem]"
        >
          <button type="button" onClick={() => show()} className="text-left">
            Questions about rooms or Jiri? Ask me
          </button>
          <button type="button" onClick={dismissTip} aria-label="Dismiss" className="-m-1 rounded p-1 text-muted hover:text-ink">
            <X size={16} aria-hidden />
          </button>
        </div>
      )}

      <button
        ref={launcher}
        id="chat-launcher"
        type="button"
        onClick={() => (open ? close() : show())}
        aria-label="Chat with Hotel Pine Valley assistant"
        aria-expanded={open}
        aria-controls={loaded ? "chat-panel" : undefined}
        className={cn(
          "fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-clay-600 text-white shadow-lg transition-[background-color,scale] duration-(--dur-base) ease-smooth hover:bg-clay-700 active:scale-95 lg:right-6 lg:bottom-6 lg:px-5",
          // On phones the panel is full-screen; on the booking form the launcher must never cover inputs or submit.
          open && "max-lg:hidden",
          onBooking && "max-lg:hidden",
        )}
      >
        {open ? <X size={24} aria-hidden /> : <MessageCircle size={24} aria-hidden />}
        <span className="hidden font-semibold lg:inline">{open ? "Close" : "Ask us"}</span>
      </button>

      {loaded && <ChatPanel open={open} onClose={close} prefill={prefill} pathname={pathname} name={name} phone={phone} whatsapp={whatsapp} />}
    </>
  );
}
