import { z } from "zod";
import { getHotel } from "@/lib/data/public";
import { chatOn, streamWithFallback } from "@/lib/ai/client";
import { chatInstructions, chatInstructionsWithoutTools } from "@/lib/ai/prompt";
import { detectLanguage, languageRule } from "@/lib/ai/language";
import { quickReply } from "@/lib/ai/quick-reply";
import { redactContacts } from "@/lib/ai/redact";
import { chatTools, hotelInfo, roomsInfo } from "@/lib/ai/tools";
import { DRAFT_SEPARATOR, type InquiryDraft } from "@/lib/ai/chat-shared";
import { chatSessionOk, rateLimited, startChatSession } from "@/lib/ai/inquiry-draft";
import { currentIp, currentIpHash, isSameOrigin } from "@/lib/security";
import { verifyTurnstile } from "@/lib/turnstile";

export const maxDuration = 60;

/** Caps — keep each request small and the free-tier quota safe. */
const MAX_USER_CHARS = 1000;
const MAX_ASSISTANT_CHARS = 4000;
const MAX_MESSAGES = 20;
const MAX_OUTPUT_TOKENS = 500;

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(MAX_ASSISTANT_CHARS) }))
    .min(1)
    .max(MAX_MESSAGES)
    .refine((m) => m.at(-1)!.role === "user" && m.every((x) => x.role === "assistant" || x.content.length <= MAX_USER_CHARS)),
  page: z
    .object({ path: z.string().max(200).optional(), roomSlug: z.string().max(80).regex(/^[a-z0-9-]+$/).optional() })
    .default({}),
  turnstileToken: z.string().max(4096).optional(),
});

const json = (error: string, status: number) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  if (!chatOn(await getHotel())) return json("disabled", 404);
  if (!(await isSameOrigin())) return json("bad_request", 403);

  const ipHash = await currentIpHash();
  if (rateLimited(ipHash)) return json("rate_limited", 429);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(parsed.error.issues.some((i) => i.code === "too_big") ? "too_long" : "bad_request", 400);
  const { messages, page, turnstileToken } = parsed.data;

  if (process.env.TURNSTILE_SECRET_KEY && !(await chatSessionOk())) {
    if (!(await verifyTurnstile(turnstileToken ?? "", await currentIp()))) return json("verify", 403);
    await startChatSession();
  }

  // Simple English questions (hi, rates, how many rooms, how to book) are answered from data — no model call, instant.
  const latest = messages.at(-1)!.content;
  if (detectLanguage(latest) === "english") {
    const [rooms, contact] = await Promise.all([roomsInfo(), hotelInfo("contact")]);
    const quick = quickReply(latest, { rooms, ...(contact as { phone: string; whatsapp: string }) });
    if (quick) return new Response(quick, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }

  // Guest emails/phones are replaced by placeholders before anything reaches the model.
  const { messages: safe, values } = redactContacts(messages);
  const [base, baseWithoutTools] = await Promise.all([chatInstructions(page), chatInstructionsWithoutTools(page)]);
  // Reply language is decided in code from the guest's latest message and put last, where models follow it best.
  const lang = languageRule(messages.at(-1)!.content);

  // createInquiry never sends anything: it hands us a signed draft, which goes to the browser after the reply text
  // (after a U+001E separator) and is shown as a card — only the guest's "Yes, send" button submits it.
  let draft: InquiryDraft | undefined;
  const r = await streamWithFallback({
    instructions: `${base}\n\n${lang}`,
    instructionsWithoutTools: `${baseWithoutTools}\n\n${lang}`,
    messages: safe,
    tools: chatTools({ contacts: values, onDraft: (d) => (draft = d) }),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    abortSignal: req.signal,
  });
  if (!r.ok) return json("unavailable", 503);
  const withDraft = new TransformStream<Uint8Array, Uint8Array>({
    flush(c) {
      if (draft) c.enqueue(new TextEncoder().encode(DRAFT_SEPARATOR + JSON.stringify(draft)));
    },
  });
  return new Response(r.stream.pipeThrough(withDraft), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
