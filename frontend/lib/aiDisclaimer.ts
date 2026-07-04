/**
 * lib/aiDisclaimer.ts — Splits a backend AI response string into narrative +
 * disclaimer for separate styling (AI-05, D-19, 05-UI-SPEC.md Copywriting
 * Contract).
 *
 * Every /api/ai/* text field (ringkasanText/wawasanText/analisisText/
 * saranText) is stored as `narrative + "\n\n" + AI_DISCLAIMER` (see backend
 * lib/aiDisclaimer.ts::appendDisclaimer). The frontend must render the
 * disclaimer verbatim, never omitted or shortened — this helper locates the
 * exact substring the backend appended and returns it unmodified so every AI
 * card can style it distinctly (10px italic muted) from the main narrative.
 */

// Verbatim string from 05-UI-SPEC.md Copywriting Contract — mirrors backend's
// lib/aiDisclaimer.ts::AI_DISCLAIMER exactly, used only to locate the split
// point (the actual rendered text always comes from the backend response).
export const AI_DISCLAIMER =
  "Ringkasan ini dibuat otomatis oleh AI dan tidak menggantikan saran medis profesional. " +
  "Selalu konsultasikan kondisi Anda dengan dokter atau tenaga kesehatan.";

export interface SplitAiText {
  narrative: string;
  disclaimer: string;
}

/**
 * Splits `text` into { narrative, disclaimer }. If the known disclaimer
 * substring isn't found (unexpected backend response shape), the entire
 * text is treated as narrative and disclaimer is returned empty — the
 * caller should still render whatever backend text exists, never hide it.
 */
export function splitAiText(text: string): SplitAiText {
  const idx = text.indexOf(AI_DISCLAIMER);
  if (idx === -1) {
    return { narrative: text.trim(), disclaimer: "" };
  }
  return {
    narrative: text.slice(0, idx).trim(),
    disclaimer: text.slice(idx).trim(),
  };
}
