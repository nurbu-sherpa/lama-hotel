import { APICallError, generateText, stepCountIs, streamText, type LanguageModel, type ModelMessage, type ToolSet } from "ai";
import { createGoogle } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";

/**
 * The ONLY file that knows which AI providers exist. Everything else calls generateWithFallback(),
 * streamWithFallback() and isAiEnabled(). Order: Gemini → Groq → Cloudflare Workers AI or OpenRouter (free models).
 * A provider without its key is skipped; with no provider (or AI_CHAT_ENABLED≠"true") AI is off
 * and every AI feature hides itself.
 */

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const opt = z.preprocess(blank, z.string().trim().optional());

const envSchema = z
  .object({
    AI_CHAT_ENABLED: z.preprocess(blank, z.enum(["true", "false"]).optional()),
    AI_PRIMARY_MODEL: opt,
    GOOGLE_GENERATIVE_AI_API_KEY: opt,
    AI_FALLBACK1_MODEL: opt,
    GROQ_API_KEY: opt,
    AI_FALLBACK2_PROVIDER: z.preprocess(blank, z.enum(["cloudflare", "openrouter"]).optional()),
    AI_FALLBACK2_MODEL: opt,
    CLOUDFLARE_ACCOUNT_ID: opt,
    CLOUDFLARE_API_TOKEN: opt,
    OPENROUTER_API_KEY: opt,
    /** Comma list of providers whose model can't call tools, e.g. "openrouter". They answer from inlined hotel info only. */
    AI_NO_TOOLS_PROVIDERS: opt,
  })
  .refine((e) => e.AI_FALLBACK2_PROVIDER !== "openrouter" || !e.AI_FALLBACK2_MODEL || e.AI_FALLBACK2_MODEL.endsWith(":free"), {
    path: ["AI_FALLBACK2_MODEL"],
    message: 'OpenRouter models must be free ones (id ending in ":free")',
  });

type ProviderOptions = Parameters<typeof generateText>[0]["providerOptions"];
export type AiProvider = { name: string; model: () => LanguageModel; tools: boolean; options?: ProviderOptions };

/** Parse env → { enabled, providers in fallback order }. Invalid config switches AI off (logged), never crashes the site. */
export function loadAiConfig(raw: Record<string, string | undefined>): { enabled: boolean; providers: AiProvider[] } {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(`[ai] AI disabled — invalid env: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    return { enabled: false, providers: [] };
  }
  const e = parsed.data;
  const providers: Omit<AiProvider, "tools">[] = [];
  if (e.GOOGLE_GENERATIVE_AI_API_KEY) {
    const key = e.GOOGLE_GENERATIVE_AI_API_KEY;
    const id = e.AI_PRIMARY_MODEL ?? "gemini-3.1-flash-lite";
    providers.push({
      name: "gemini",
      model: () => createGoogle({ apiKey: key })(id),
      // Gemini 3 "thinks" by default — 10–20 s before the first word. A guest chat doesn't need it (≈1–2 s with "minimal").
      options: id.startsWith("gemini-2") ? undefined : { google: { thinkingConfig: { thinkingLevel: "minimal" } } },
    });
  }
  if (e.GROQ_API_KEY) {
    const key = e.GROQ_API_KEY;
    const id = e.AI_FALLBACK1_MODEL ?? "openai/gpt-oss-120b";
    providers.push({
      name: "groq",
      model: () => createGroq({ apiKey: key })(id),
      options: id.startsWith("openai/gpt-oss") ? { groq: { reasoningEffort: "low" } } : undefined,
    });
  }
  // AI_FALLBACK2_PROVIDER picks one; left empty, every fallback-2 provider with keys is used (Cloudflare, then OpenRouter).
  const wanted = (name: "cloudflare" | "openrouter") => !e.AI_FALLBACK2_PROVIDER || e.AI_FALLBACK2_PROVIDER === name;
  // AI_FALLBACK2_MODEL only applies when AI_FALLBACK2_PROVIDER names the provider (model ids differ between them).
  const model2 = (fallback: string) => (e.AI_FALLBACK2_PROVIDER && e.AI_FALLBACK2_MODEL) || fallback;
  if (wanted("cloudflare") && e.CLOUDFLARE_ACCOUNT_ID && e.CLOUDFLARE_API_TOKEN) {
    const baseURL = `https://api.cloudflare.com/client/v4/accounts/${e.CLOUDFLARE_ACCOUNT_ID}/ai/v1`;
    const key = e.CLOUDFLARE_API_TOKEN;
    providers.push({
      name: "cloudflare",
      model: () => createOpenAICompatible({ name: "cloudflare", baseURL, apiKey: key })(model2("@cf/zai-org/glm-4.7-flash")),
    });
  }
  if (wanted("openrouter") && e.OPENROUTER_API_KEY) {
    const key = e.OPENROUTER_API_KEY;
    providers.push({
      name: "openrouter",
      model: () => createOpenAICompatible({ name: "openrouter", baseURL: "https://openrouter.ai/api/v1", apiKey: key })(model2("google/gemma-4-31b-it:free")),
    });
  }
  const noTools = new Set((e.AI_NO_TOOLS_PROVIDERS ?? "").split(",").map((s) => s.trim()));
  return { enabled: e.AI_CHAT_ENABLED === "true" && providers.length > 0, providers: providers.map((p) => ({ ...p, tools: !noTools.has(p.name) })) };
}

const config = loadAiConfig(process.env);

/** True when AI features should be shown. False → every AI surface renders nothing. */
export function isAiEnabled() {
  return config.enabled;
}

/** Guest chat on the website: AI configured in the environment AND switched on by the owner (Admin → Settings). */
export function chatOn(hotel: { aiChatEnabled: boolean } | null | undefined) {
  return config.enabled && Boolean(hotel?.aiChatEnabled);
}

/** Fall back only when the provider is unavailable (rate limit, quota, timeout, 5xx, dead key, retired model) — never on a bad request. */
export function shouldFallBack(err: unknown): boolean {
  if (APICallError.isInstance(err)) {
    const s = err.statusCode;
    if (s === undefined) return true; // no response at all (network)
    return s === 401 || s === 403 || s === 404 || s === 408 || s === 429 || s >= 500 || err.isRetryable;
  }
  for (let e: unknown = err, depth = 0; e && depth < 3; e = (e as { cause?: unknown }).cause, depth++) {
    const name = (e as { name?: string }).name;
    if (name === "TimeoutError" || name === "AbortError") return true;
  }
  return err instanceof TypeError; // fetch() network failure
}

const errLabel = (err: unknown) => (APICallError.isInstance(err) ? `HTTP ${err.statusCode ?? "network"}` : ((err as { name?: string })?.name ?? "error"));

/**
 * Try each provider in order. If all are busy/unavailable and `retryDelayMs` is set, wait and go round once more
 * (free tiers often have short "high demand" spikes). Logs the provider name only — never prompts, replies or guest data.
 */
export async function runChain<T>(
  providers: AiProvider[],
  call: (p: AiProvider) => Promise<T>,
  retryDelayMs?: number,
): Promise<{ ok: true; value: T; provider: string } | { ok: false }> {
  for (let pass = 0; pass < (retryDelayMs === undefined ? 1 : 2); pass++) {
    if (pass > 0) {
      console.warn(`[ai] all providers busy, retrying in ${retryDelayMs}ms`);
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
    for (const p of providers) {
      try {
        const value = await call(p);
        console.info(`[ai] handled by ${p.name}`);
        return { ok: true, value, provider: p.name };
      } catch (err) {
        if (!shouldFallBack(err)) {
          console.error(`[ai] ${p.name} rejected the request (${errLabel(err)}) — not falling back`);
          return { ok: false };
        }
        console.warn(`[ai] ${p.name} unavailable (${errLabel(err)}), trying next provider`);
      }
    }
  }
  if (providers.length) console.error("[ai] all providers failed");
  return { ok: false };
}

const RETRY_DELAY_MS = 2000;

const TIMEOUT_MS = 15_000;

export async function generateWithFallback(opts: {
  instructions: string;
  prompt: string;
  maxOutputTokens?: number;
}): Promise<{ ok: true; text: string; provider: string } | { ok: false; reason: "disabled" | "failed" }> {
  if (!config.enabled) return { ok: false, reason: "disabled" };
  const r = await runChain(config.providers, async (p) => {
    const { text } = await generateText({ model: p.model(), providerOptions: p.options, ...opts, maxOutputTokens: opts.maxOutputTokens ?? 800, maxRetries: 0, timeout: TIMEOUT_MS });
    return text.trim();
  }, RETRY_DELAY_MS);
  return r.ok && r.value ? { ok: true, text: r.value, provider: r.provider } : { ok: false, reason: "failed" };
}

const FIRST_TEXT_MS = 8000;
const LAST_PROVIDER_MS = 20_000;
const CUT_OFF = "\n\n(Sorry, I was cut off. Please ask again, or call / WhatsApp us.)";

/**
 * Stream a chat reply. Falls back to the next provider only if one fails BEFORE its first text
 * is produced — once text has started we never switch providers mid-reply.
 */
export async function streamWithFallback(opts: {
  instructions: string;
  /** Used instead of `instructions` for providers listed in AI_NO_TOOLS_PROVIDERS (no tools passed). */
  instructionsWithoutTools: string;
  messages: ModelMessage[];
  tools: ToolSet;
  maxOutputTokens: number;
  abortSignal?: AbortSignal;
}): Promise<{ ok: true; stream: ReadableStream<Uint8Array>; provider: string } | { ok: false; reason: "disabled" | "failed" }> {
  if (!config.enabled) return { ok: false, reason: "disabled" };
  const r = await runChain(config.providers, async (p) => {
    // Hard limit per provider: no text within FIRST_TEXT_MS (incl. any tool step) → cancel and use the next provider.
    // The last provider has nobody to hand over to, so it gets longer.
    const limit = p === config.providers.at(-1) ? LAST_PROVIDER_MS : FIRST_TEXT_MS;
    const attempt = new AbortController();
    const timer = setTimeout(() => attempt.abort(new DOMException("no reply in time", "TimeoutError")), limit);
    const result = streamText({
      model: p.model(),
      providerOptions: p.options,
      instructions: p.tools ? opts.instructions : opts.instructionsWithoutTools,
      messages: opts.messages,
      tools: p.tools ? opts.tools : undefined,
      stopWhen: stepCountIs(4),
      maxOutputTokens: opts.maxOutputTokens,
      maxRetries: 0,
      abortSignal: opts.abortSignal ? AbortSignal.any([opts.abortSignal, attempt.signal]) : attempt.signal,
      timeout: { chunkMs: 15_000, toolMs: 10_000, totalMs: 60_000 },
      onError: () => {}, // errors arrive as stream parts below; the default logger could print content
    });
    const parts = result.fullStream[Symbol.asyncIterator]();
    let first = "";
    try {
      for (;;) {
        const { done, value } = await parts.next();
        if (opts.abortSignal?.aborted) throw new Error("client went away"); // not a provider problem → no fallback
        if (attempt.signal.aborted) throw attempt.signal.reason; // too slow → fall back
        if (done) break;
        if (value.type === "error") throw value.error;
        if (value.type === "text-delta" && value.text) {
          first = value.text;
          break;
        }
      }
    } finally {
      clearTimeout(timer);
    }
    const enc = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      start(c) {
        if (!first) {
          c.enqueue(enc.encode("Sorry, I couldn't find an answer to that. Please call or WhatsApp us."));
          c.close();
        } else c.enqueue(enc.encode(first));
      },
      async pull(c) {
        try {
          // Keep reading until there is text to send: a pull that enqueues nothing is never called again.
          for (;;) {
            const { done, value } = await parts.next();
            if (done) return c.close();
            if (value.type === "text-delta" && value.text) return c.enqueue(enc.encode(value.text));
            if (value.type === "error" || value.type === "abort") throw value.type === "error" ? value.error : new Error("aborted");
          }
        } catch (err) {
          console.warn(`[ai] ${p.name} failed mid-reply (${errLabel(err)})`);
          c.enqueue(enc.encode(CUT_OFF));
          c.close();
        }
      },
      cancel() {
        void parts.return?.();
      },
    });
  }, RETRY_DELAY_MS);
  return r.ok ? { ok: true, stream: r.value, provider: r.provider } : { ok: false, reason: "failed" };
}
