"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellRing, CalendarCheck, MessageSquare, Volume2, VolumeX, X } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils/format";
import { NOTIFY_CLEARED_COOKIE } from "@/config/site";

type Item = { id: string; type: "booking" | "message"; title: string; detail: string; href: string; createdAt: string; unread: boolean };
type Feed = { newBookings: number; newMessages: number; items: Item[]; serverTime: string };

const POLL_MS = 15_000;
const SEEN_KEY = "lama-admin-last-seen";
const SOUND_KEY = "lama-admin-sound";

const store = {
  get(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* private mode etc. — fine */
    }
  },
};

/** Short, gentle two-tone chime generated with Web Audio (no sound file needed). */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* audio unavailable */
  }
}

/**
 * Live notifications for the admin: polls /api/admin/notifications every 15 seconds while the
 * tab is visible (and immediately when it becomes visible again). New website booking inquiries
 * and contact messages show a pop-up, update the bell count and refresh the page data — no reload.
 */
export function AdminNotifier({ initialCount, initialClearedAt }: { initialCount: number; initialClearedAt: string | null }) {
  const router = useRouter();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [open, setOpen] = useState(false);
  const [alert, setAlert] = useState<{ item: Item; more: number } | null>(null);
  const [sound, setSound] = useState(false);
  // Per-device "cleared up to" time (cookie, so the server-rendered badge already respects it).
  // Hides older items from the bell only — their booking/message status is untouched.
  const [clearedAt, setClearedAt] = useState(initialClearedAt);
  const [desktop, setDesktop] = useState<NotificationPermission | "unsupported">("default");
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load per-browser preferences after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only settings once on mount
    setSound(store.get(SOUND_KEY) === "on");
    setDesktop("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Feed;
      setFeed(data);

      const lastSeen = store.get(SEEN_KEY);
      if (!lastSeen) {
        // First run in this browser: don't announce older items.
        store.set(SEEN_KEY, data.serverTime);
        return;
      }
      const fresh = data.items.filter((i) => i.createdAt > lastSeen);
      if (!fresh.length) return;

      store.set(SEEN_KEY, fresh[0].createdAt);
      setAlert({ item: fresh[0], more: fresh.length - 1 });
      if (store.get(SOUND_KEY) === "on") chime();
      if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
        const n = new Notification(fresh[0].title, { body: fresh[0].detail, tag: fresh[0].id });
        n.onclick = () => {
          window.focus();
          router.push(fresh[0].href);
        };
      }
      // Refresh server data (sidebar badges, lists, dashboard) without a full reload.
      router.refresh();
    } catch {
      /* offline — try again next tick */
    }
  }, [router]);

  useEffect(() => {
    const first = setTimeout(poll, 1500);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  // Auto-hide the pop-up after a while.
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 15_000);
    return () => clearTimeout(t);
  }, [alert]);

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = feed ? feed.items.filter((i) => !clearedAt || i.createdAt > clearedAt) : [];
  // After "Clear", the badge counts only unread items that arrived since; otherwise all NEW inquiries/messages.
  const count = !feed ? initialCount : clearedAt ? visible.filter((i) => i.unread).length : feed.newBookings + feed.newMessages;

  const clearAll = () => {
    const t = feed?.serverTime ?? new Date().toISOString(); // server clock, same as item timestamps
    document.cookie = `${NOTIFY_CLEARED_COOKIE}=${encodeURIComponent(t)}; path=/admin; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
    setClearedAt(t);
  };

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-notifications"
          aria-label={count ? `Notifications, ${count} new` : "Notifications"}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-forest-800 hover:bg-cream-100"
        >
          {count ? <BellRing size={20} aria-hidden /> : <Bell size={20} aria-hidden />}
          {count > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-5 rounded-full bg-clay-600 px-1 text-center text-[0.68rem] leading-5 font-bold text-white" aria-hidden>
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>

        {open && (
          <div
            ref={panelRef}
            id="admin-notifications"
            role="dialog"
            aria-label="Notifications"
            // Phones: full-width sheet under the header, centred with equal margins (the header's
            // backdrop-filter makes it the containing block, and it spans the screen). Larger: dropdown.
            className="fixed inset-x-3 top-17 z-50 animate-fade-up overflow-hidden rounded-xl border border-cream-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96 sm:rounded-lg"
          >
            <div className="flex items-center justify-between gap-3 border-b border-cream-100 px-4 py-3">
              <div>
                <p className="font-semibold text-forest-900">Notifications</p>
                <p className="text-xs text-muted">Updates every 15 seconds</p>
              </div>
              {visible.length > 0 && (
                <button type="button" onClick={clearAll} className="inline-flex min-h-9 items-center rounded-md px-2.5 text-sm font-semibold text-clay-700 hover:bg-cream-100">
                  Clear all
                </button>
              )}
            </div>
            {!feed ? (
              <p className="px-4 py-6 text-sm text-muted">Loading…</p>
            ) : visible.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                {feed.items.length ? "You're all caught up. New inquiries and messages will appear here." : "No booking inquiries or messages in the last 14 days."}
              </p>
            ) : (
              <ul className="max-h-[60vh] divide-y divide-cream-100 overflow-y-auto overscroll-contain sm:max-h-96">
                {visible.map((i) => (
                  <li key={`${i.type}-${i.id}`}>
                    <Link href={i.href} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-cream-50">
                      <span className={cn("mt-0.5 shrink-0", i.type === "booking" ? "text-clay-600" : "text-forest-600")}>
                        {i.type === "booking" ? <CalendarCheck size={18} aria-hidden /> : <MessageSquare size={18} aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-semibold text-forest-900">
                          {i.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-clay-600" aria-label="New" />}
                          <span className="truncate">{i.title}</span>
                        </span>
                        <span className="block truncate text-xs text-muted">{i.detail}</span>
                        <span className="block text-xs text-muted/80">{formatDateTime(i.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t border-cream-100 bg-cream-50 px-4 py-3 text-sm">
              <button
                type="button"
                onClick={() => {
                  const next = !sound;
                  setSound(next);
                  store.set(SOUND_KEY, next ? "on" : "off");
                  if (next) chime();
                }}
                aria-pressed={sound}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-cream-300 bg-white px-2.5 font-medium hover:bg-cream-100"
              >
                {sound ? <Volume2 size={15} aria-hidden /> : <VolumeX size={15} aria-hidden />} Sound {sound ? "on" : "off"}
              </button>
              {desktop !== "unsupported" && desktop !== "granted" && (
                <button
                  type="button"
                  onClick={async () => setDesktop(await Notification.requestPermission())}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-cream-300 bg-white px-2.5 font-medium hover:bg-cream-100"
                  disabled={desktop === "denied"}
                  title={desktop === "denied" ? "Blocked in your browser settings" : undefined}
                >
                  <BellRing size={15} aria-hidden /> {desktop === "denied" ? "Desktop alerts blocked" : "Enable desktop alerts"}
                </button>
              )}
              {desktop === "granted" && <span className="text-xs text-forest-700">Desktop alerts on</span>}
              <Link href="/admin/bookings" onClick={() => setOpen(false)} className="ml-auto inline-flex min-h-9 items-center font-semibold text-clay-700">
                All inquiries →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Pop-up for newly arrived items */}
      <div aria-live="polite" role="status" className="pointer-events-none fixed top-20 right-4 left-4 z-[70] flex justify-end sm:left-auto">
        {alert && (
          <div className="pointer-events-auto w-full max-w-sm animate-fade-up rounded-lg border-l-4 border-l-clay-600 bg-white p-4 shadow-xl ring-1 ring-cream-200">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-clay-600">{alert.item.type === "booking" ? <CalendarCheck size={20} aria-hidden /> : <MessageSquare size={20} aria-hidden />}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wide text-clay-700 uppercase">{alert.item.type === "booking" ? "New booking inquiry" : "New message"}</p>
                <p className="mt-0.5 font-semibold text-forest-900">{alert.item.title.replace(/^.*? — /, "")}</p>
                <p className="text-sm text-muted">{alert.item.detail}</p>
                {alert.more > 0 && <p className="mt-1 text-xs text-muted">+{alert.more} more</p>}
                <Link href={alert.item.href} onClick={() => setAlert(null)} className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-forest-800 underline-offset-4 hover:underline">
                  View now →
                </Link>
              </div>
              <button type="button" onClick={() => setAlert(null)} aria-label="Dismiss" className="rounded-md p-1 text-muted hover:bg-cream-100">
                <X size={16} aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
