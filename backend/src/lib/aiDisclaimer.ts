/**
 * lib/aiDisclaimer.ts — Backend-enforced medical disclaimer (AI-05, D-19)
 *
 * The fixed disclaimer is appended unconditionally by every AI-generating
 * service (daily summary, weekly insight, lab analysis, lifestyle suggestion,
 * anomaly explanation) — regardless of what the LLM itself outputs, even if
 * the model's own system-prompt-instructed disclaimer happens to appear.
 *
 * This is a dependency-free pure module: no I/O, no Groq import, just string
 * composition. The frontend renders exactly what the backend returns and must
 * never omit or shorten this string (per 05-UI-SPEC.md Copywriting Contract).
 *
 * Usage: import { AI_DISCLAIMER, appendDisclaimer } from "../lib/aiDisclaimer.js";
 *        const stored = appendDisclaimer(llmNarrativeText);
 */

// Verbatim string from 05-UI-SPEC.md Copywriting Contract — do not paraphrase.
export const AI_DISCLAIMER =
  "Ringkasan ini dibuat otomatis oleh AI dan tidak menggantikan saran medis profesional. " +
  "Selalu konsultasikan kondisi Anda dengan dokter atau tenaga kesehatan.";

/**
 * Appends the fixed AI_DISCLAIMER to narrativeText, separated by a blank line.
 * Always returns narrativeText + disclaimer, regardless of input content.
 */
export function appendDisclaimer(narrativeText: string): string {
  return `${narrativeText}\n\n${AI_DISCLAIMER}`;
}
