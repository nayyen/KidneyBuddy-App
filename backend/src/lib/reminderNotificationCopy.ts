/**
 * lib/reminderNotificationCopy.ts — shared jenis-aware notification copy helpers
 * (quick-260705-p9y: extracted from reminderDispatch.job.ts so both the dispatch
 * job and the missed-reminder follow-up job share one source of truth).
 *
 * Distinguishes HD (literally blood dialysis) from CAPD (fluid-exchange dialysis)
 * with different emoji, while sharing the same Indonesian label ("Cuci Darah")
 * since both are dialysis-therapy reminders from the patient's perspective.
 */

export const JENIS_EMOJI: Record<string, string> = {
  obat: "💊",
  capd: "💧",
  hd: "🩸",
};

export const JENIS_LABEL: Record<string, string> = {
  obat: "Obat",
  capd: "Cuci Darah",
  hd: "Cuci Darah",
};

export function jenisEmoji(jenis: string): string {
  return JENIS_EMOJI[jenis] ?? "🔔";
}

export function jenisLabel(jenis: string): string {
  return JENIS_LABEL[jenis] ?? "Pengingat";
}

/**
 * Noun phrase describing what the patient hasn't confirmed yet, used in the
 * missed-reminder follow-up push body (e.g. "Kamu belum mengonfirmasi
 * {jenisFollowUpNoun(jenis)} — ketuk untuk konfirmasi sekarang.").
 */
export function jenisFollowUpNoun(jenis: string): string {
  if (jenis === "obat") return "minum obat ini";
  if (jenis === "capd" || jenis === "hd") return "sesi cuci darah ini";
  return "pengingat ini";
}
