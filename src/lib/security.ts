import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for / x-real-ip). */
export function clientIpFrom(h: Headers) {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}

/** Salted, one-way hash so we never store raw IP addresses. */
export function hashIp(ip: string) {
  return createHash("sha256")
    .update(`${process.env.AUTH_SECRET ?? "lama"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

/** Short fingerprint of the stored password hash, kept in the session to detect password changes. */
export function passwordFingerprint(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

export async function currentIp() {
  return clientIpFrom(await headers());
}

export async function currentIpHash() {
  return hashIp(await currentIp());
}

/**
 * Light-weight check that a Server Action request came from our own site.
 * (Next.js already compares Origin and Host for Server Actions; this is defence in depth.)
 */
export async function isSameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return true;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
