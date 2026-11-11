import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { bookingSchema } from "@/lib/validation/schemas";
import { todayInNepal } from "@/lib/utils/format";
import type { BookingData } from "@/server/services/inquiries";

/**
 * Chat guard rails shared by /api/chat and /api/chat/confirm:
 *  - booking DRAFTS: the AI can only prepare a signed draft; the guest's button press sends it,
 *  - the Turnstile chat-session cookie,
 *  - the per-IP rate limiter.
 */

const secret = () => process.env.AUTH_SECRET ?? "lama";
const hmac = (s: string) => createHmac("sha256", secret()).update(s).digest("base64url");
const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// ── Booking drafts ─────────────────────────────────────────────
const DRAFT_MS = 30 * 60_000;

/** Signed, tamper-proof draft the guest's browser holds until they press "Yes, send to the owner". */
export function signDraft(data: BookingData, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ data, exp: now + DRAFT_MS })).toString("base64url");
  return `${body}.${hmac(`draft:${body}`)}`;
}

/** The draft's booking data, or null if tampered with, expired or no longer valid (e.g. dates now in the past). */
export function readDraft(token: string, now = Date.now()): BookingData | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !same(sig, hmac(`draft:${body}`))) return null;
  try {
    const { data, exp } = JSON.parse(Buffer.from(body, "base64url").toString()) as { data: unknown; exp: number };
    if (!(exp > now)) return null;
    const parsed = bookingSchema(todayInNepal()).safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// ── Turnstile once per chat session (signed, short-lived cookie) ──
const COOKIE = "lh-chat";
const SESSION_MS = 2 * 60 * 60_000;

export async function chatSessionOk() {
  const [exp, sig] = ((await cookies()).get(COOKIE)?.value ?? "").split(".");
  return Boolean(exp && sig && Number(exp) > Date.now() && same(sig, hmac(`chat:${exp}`)));
}

export async function startChatSession() {
  const exp = String(Date.now() + SESSION_MS);
  (await cookies()).set(COOKIE, `${exp}.${hmac(`chat:${exp}`)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/api/chat", // also covers /api/chat/confirm
    maxAge: SESSION_MS / 1000,
  });
}

// ── Per-IP rate limit ──────────────────────────────────────────
// ponytail: in-memory per-IP limiter. On Vercel each warm instance keeps its own counts and a cold start resets
// them, so the real ceiling is limit × instances. Fine for a small lodge; use Upstash/Redis if abuse ever shows up.
const WINDOWS = [
  { ms: 10 * 60_000, max: 30 },
  { ms: 24 * 60 * 60_000, max: 150 },
];
const hits = new Map<string, number[]>();
export function rateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOWS[1].ms);
  if (WINDOWS.some((w) => recent.filter((t) => now - t < w.ms).length >= w.max)) return true;
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // memory guard
  return false;
}
