import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { APICallError } from "ai";
import { loadAiConfig, runChain, type AiProvider } from "../src/lib/ai/client";

const apiError = (statusCode: number) =>
  new APICallError({ message: `HTTP ${statusCode}`, url: "https://example.test", requestBodyValues: {}, statusCode, isRetryable: statusCode === 429 || statusCode >= 500 });
const timeout = () => new DOMException("timeout of 15000ms exceeded", "TimeoutError");

const providers = (...names: string[]): AiProvider[] => names.map((name) => ({ name, tools: true, model: () => { throw new Error("not used"); } }));

/** Each provider's behaviour: an error to throw, or a string to return. */
const fake = (behaviour: Record<string, unknown>) => {
  const calls: string[] = [];
  const call = async (p: AiProvider) => {
    calls.push(p.name);
    const b = behaviour[p.name];
    if (typeof b === "string") return b;
    throw b;
  };
  return { calls, call };
};

describe("AI provider fallback", () => {
  for (const [label, err] of [["429", apiError(429)], ["503", apiError(503)], ["timeout", timeout()]] as const) {
    it(`falls back on ${label}`, async () => {
      const { calls, call } = fake({ gemini: err, groq: "hello" });
      const r = await runChain(providers("gemini", "groq"), call);
      assert.deepEqual(r, { ok: true, value: "hello", provider: "groq" });
      assert.deepEqual(calls, ["gemini", "groq"]);
    });
  }

  it("does not fall back on 400", async () => {
    const { calls, call } = fake({ gemini: apiError(400), groq: "hello" });
    assert.deepEqual(await runChain(providers("gemini", "groq"), call), { ok: false });
    assert.deepEqual(calls, ["gemini"]);
  });

  it("waits and tries the chain once more when every provider is busy", async () => {
    let n = 0;
    const r = await runChain(providers("gemini"), async () => (++n === 1 ? Promise.reject(apiError(503)) : "second time lucky"), 10);
    assert.deepEqual(r, { ok: true, value: "second time lucky", provider: "gemini" });
    assert.equal(n, 2);
  });

  it("fails gracefully when every provider fails", async () => {
    const { calls, call } = fake({ gemini: apiError(429), groq: apiError(500), openrouter: timeout() });
    assert.deepEqual(await runChain(providers("gemini", "groq", "openrouter"), call), { ok: false });
    assert.deepEqual(calls, ["gemini", "groq", "openrouter"]);
  });
});

describe("AI config", () => {
  const names = (env: Record<string, string>) => loadAiConfig(env).providers.map((p) => p.name);

  it("skips providers with missing keys", () => {
    assert.deepEqual(names({ AI_CHAT_ENABLED: "true", GROQ_API_KEY: "g" }), ["groq"]);
    assert.deepEqual(names({ AI_CHAT_ENABLED: "true", GOOGLE_GENERATIVE_AI_API_KEY: "", AI_FALLBACK2_PROVIDER: "cloudflare", CLOUDFLARE_ACCOUNT_ID: "a" }), []);
  });

  it("orders Gemini → Groq → fallback 2 and picks the fallback-2 provider by env", () => {
    const base = { AI_CHAT_ENABLED: "true", GOOGLE_GENERATIVE_AI_API_KEY: "k", GROQ_API_KEY: "g", CLOUDFLARE_ACCOUNT_ID: "a", CLOUDFLARE_API_TOKEN: "t", OPENROUTER_API_KEY: "o" };
    assert.deepEqual(names({ ...base, AI_FALLBACK2_PROVIDER: "cloudflare" }), ["gemini", "groq", "cloudflare"]);
    assert.deepEqual(names({ ...base, AI_FALLBACK2_PROVIDER: "openrouter" }), ["gemini", "groq", "openrouter"]);
  });

  it("uses every fallback-2 provider with keys when AI_FALLBACK2_PROVIDER is empty", () => {
    const env = { AI_CHAT_ENABLED: "true", GROQ_API_KEY: "g", CLOUDFLARE_ACCOUNT_ID: "a", CLOUDFLARE_API_TOKEN: "t", OPENROUTER_API_KEY: "o" };
    assert.deepEqual(names(env), ["groq", "cloudflare", "openrouter"]);
    assert.deepEqual(names({ ...env, OPENROUTER_API_KEY: "" }), ["groq", "cloudflare"]);
  });

  it("is disabled unless AI_CHAT_ENABLED=true and a provider exists", () => {
    assert.equal(loadAiConfig({ GROQ_API_KEY: "g" }).enabled, false);
    assert.equal(loadAiConfig({ AI_CHAT_ENABLED: "true" }).enabled, false);
    assert.equal(loadAiConfig({ AI_CHAT_ENABLED: "true", GROQ_API_KEY: "g" }).enabled, true);
  });

  it("rejects non-free OpenRouter models", () => {
    const r = loadAiConfig({ AI_CHAT_ENABLED: "true", AI_FALLBACK2_PROVIDER: "openrouter", OPENROUTER_API_KEY: "o", AI_FALLBACK2_MODEL: "openai/gpt-4o" });
    assert.equal(r.enabled, false);
  });
});
