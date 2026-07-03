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
 * FAILS at startup if GROQ_API_KEY is missing, mirroring encryption.ts's
 * loadKey() pattern — every AI feature in this phase is unusable without it,
 * so a silent misconfiguration would surface as confusing runtime errors deep
 * inside batch jobs/controllers instead of at boot.
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

export const groq = new Groq({
  apiKey: loadApiKey(),
  timeout: 20_000, // 20s — narration calls should not hang a batch loop indefinitely
  maxRetries: 2,
});

export const GROQ_MODEL = "llama-3.3-70b-versatile" as const;
