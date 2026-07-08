/**
 * perasaan.ts — Single source of truth for the "perasaan" (feeling) label +
 * color mapping used after completing an activity (nyaman/biasa/lelah/berat).
 *
 * Extracted from ActivityList.tsx (quick-260708-s7t) so /catatan's Aktivitas
 * tab and /laporan's Aktivitas report table render the exact same colors —
 * previously each surface declared its own copy of this mapping.
 */

export const PERASAAN_LABEL: Record<string, string> = {
  nyaman: "Nyaman",
  biasa: "Biasa",
  lelah: "Lelah",
  berat: "Berat",
};

export const PERASAAN_COLOR: Record<string, string> = {
  nyaman: "#2a9d8f",
  biasa: "#7a8c8a",
  lelah: "#ef9f27",
  berat: "#d4183d",
};

/**
 * Returns a pill/badge inline style for a given perasaan key: colored text
 * on a light tint of the same color. Falls back to a neutral gray tint for
 * unknown keys so callers never need a null-check before spreading this.
 */
export function perasaanBadgeStyle(perasaan: string): {
  color: string;
  backgroundColor: string;
} {
  const color = PERASAAN_COLOR[perasaan] ?? "#7a8c8a";
  return { color, backgroundColor: `${color}20` };
}
