/**
 * lib/forbiddenPhrases.ts — D-20 false-reassurance detection + static fallback templates
 *
 * The LLM must never tell a patient "don't worry" / "this is harmless" about a
 * high-severity anomaly — false reassurance could delay urgent medical contact.
 * containsForbiddenPhrase() is checked against every LLM-generated anomaly
 * explanation before persistence; if it matches (for severity "tinggi"), the
 * caller swaps in a pre-written STATIC_FALLBACK_TEMPLATES entry instead.
 *
 * Per 05-UI-SPEC.md: this swap is invisible to the end user — no "fallback
 * mode" badge, no different styling. It is logged server-side only.
 *
 * Dependency-free pure module: plain case-insensitive substring matching,
 * no LLM calls, no I/O.
 *
 * Usage: import { containsForbiddenPhrase, STATIC_FALLBACK_TEMPLATES } from "../lib/forbiddenPhrases.js";
 */

// False-reassurance / minimizing phrasing that must never appear in a
// high-severity anomaly explanation, however calm-sounding the model output is.
export const FORBIDDEN_PHRASES: readonly string[] = [
  "tidak perlu khawatir",
  "tidak berbahaya",
  "aman saja",
  "tidak apa-apa",
  "hal biasa",
  "tidak masalah",
  "jangan khawatir",
  "tidak signifikan",
  "bukan hal serius",
  "tidak perlu cemas",
  "bisa diabaikan",
  "tidak ada yang perlu dikhawatirkan",
];

/**
 * Case-insensitive substring check against FORBIDDEN_PHRASES.
 */
export function containsForbiddenPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase));
}

// Pre-written calm-but-serious Bahasa Indonesia fallback templates, one per
// tipeAnomali, each including a concrete next step (per D-20). Used only when
// containsForbiddenPhrase() rejects the LLM's own explanation.
export const STATIC_FALLBACK_TEMPLATES: Record<string, string> = {
  kondisi_cairan_abnormal:
    "Sistem mendeteksi kondisi cairan CAPD yang tidak normal. Ini bisa menjadi tanda infeksi " +
    "yang memerlukan perhatian segera. Segera hubungi dokter atau perawat CAPD Anda.",
  jadwal_terlewat:
    "Sistem mendeteksi beberapa jadwal terapi yang terlewat hari ini. Melewatkan jadwal terapi " +
    "secara berulang dapat memengaruhi efektivitas pengobatan. Segera hubungi dokter Anda untuk " +
    "mendiskusikan jadwal terapi.",
  penurunan_volume_keluar:
    "Sistem mendeteksi penurunan volume cairan keluar yang cukup signifikan dibanding biasanya. " +
    "Ini dapat menjadi tanda gangguan pada proses dialisis Anda. Segera hubungi dokter atau " +
    "perawat CAPD Anda untuk pemeriksaan lebih lanjut.",
  pola_asupan_menyimpang:
    "Sistem mendeteksi pola asupan cairan yang menyimpang dari kebiasaan Anda selama beberapa " +
    "hari terakhir. Perubahan pola ini sebaiknya didiskusikan dengan dokter atau ahli gizi Anda " +
    "pada kesempatan berikutnya.",
};
