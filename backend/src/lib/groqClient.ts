/**
 * lib/groqClient.ts — Configured Groq API client (LLM narration)
 *
 * Satisfies D-19/AI-05 infrastructure prerequisite: every AI narration/summary/
 * insight/analysis/suggestion call site in Phase 5 depends on this singleton.
 *
 * SECURITY: GROQ_API_KEY is loaded from env vars only and NEVER logged — it
 * transits solely in the SDK's internal Authorization header. No pino/console
 * call in this module (or any caller) may log the key or raw request bodies.
 *
 * Unlike webPushClient.ts (soft-warn — push is optional), this module HARD
 * FAILS if GROQ_API_KEY is missing — but lazily, on first actual use, not at
 * import time. The backend process imports this module transitively via
 * app.ts's route registration, so throwing at module load would crash the
 * entire server on boot — including patient-safety features that have
 * nothing to do with AI — over a missing third-party key. The hard fail
 * still happens the first time any call site invokes
 * `groq.chat.completions.create(...)`, surfacing clearly in that job/
 * controller's own error path instead of silently at boot.
 *
 * Usage: import { groq, GROQ_MODEL } from "../lib/groqClient.js";
 *        await groq.chat.completions.create({ model: GROQ_MODEL, messages: [...] });
 */
import Groq from "groq-sdk";

function loadApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "[groqClient] GROQ_API_KEY env var is missing. " +
        "Get one from https://console.groq.com/keys and set it in your .env file.",
    );
  }
  return key;
}

let client: Groq | null = null;

function getClient(): Groq {
  if (!client) {
    client = new Groq({
      apiKey: loadApiKey(),
      timeout: 20_000, // 20s — narration calls should not hang a batch loop indefinitely
      maxRetries: 2,
    });
  }
  return client;
}

// Proxy defers construction (and the loadApiKey() hard-fail) until the first
// property access, e.g. `groq.chat` — so importing this module never throws.
export const groq: Groq = new Proxy({} as Groq, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient() as object, prop, receiver);
  },
});

export const GROQ_MODEL = "llama-3.3-70b-versatile" as const;
