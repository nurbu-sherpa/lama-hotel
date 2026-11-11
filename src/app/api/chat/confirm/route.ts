import { z } from "zod";
import { isAiEnabled } from "@/lib/ai/client";
import { chatSessionOk, rateLimited, readDraft } from "@/lib/ai/inquiry-draft";
import { currentIpHash, isSameOrigin } from "@/lib/security";
import { createBookingInquiry } from "@/server/services/inquiries";

/**
 * The guest pressed "Yes, send to the owner" on a booking card in the chat. Only this endpoint saves a chat
 * booking request — through the same service as the booking form (status NEW, owner + guest notified,
 * duplicate check, per-IP hourly limit). It never creates or confirms a reservation.
 */
const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  if (!isAiEnabled()) return json({ error: "disabled" }, 404);
  if (!(await isSameOrigin())) return json({ error: "bad_request" }, 403);
  const ipHash = await currentIpHash();
  if (rateLimited(ipHash)) return json({ error: "rate_limited" }, 429);
  // Same human check as the chat itself: the Turnstile session cookie set by /api/chat.
  if (process.env.TURNSTILE_SECRET_KEY && !(await chatSessionOk())) return json({ error: "verify" }, 403);

  const body = z.object({ token: z.string().max(8000) }).safeParse(await req.json().catch(() => null));
  const data = body.success ? readDraft(body.data.token) : null;
  if (!data) return json({ error: "expired" }, 400);

  try {
    const r = await createBookingInquiry(data, ipHash);
    if (r.status === "rate_limited") return json({ error: "rate_limited" }, 429);
    if (r.status === "no_room") return json({ error: "expired" }, 400);
    return json({ ok: true });
  } catch (err) {
    console.error("Chat booking request failed", err);
    return json({ error: "unavailable" }, 503);
  }
}
