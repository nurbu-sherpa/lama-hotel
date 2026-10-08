import "server-only";

/**
 * Verify a Cloudflare Turnstile token (see components/forms/Turnstile.tsx).
 * - Not configured (no TURNSTILE_SECRET_KEY): allowed — honeypot + rate limits still apply.
 * - Cloudflare says no: rejected.
 * - Cloudflare unreachable: allowed (logged), so an outage never costs a real booking.
 */
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, ...(ip !== "unknown" ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verification unavailable — allowing submission", err);
    return true;
  }
}
