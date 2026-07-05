/**
 * therapyReminderScope.ts — Single source of truth for therapy-vs-jenis
 * reminder visibility scoping (REMIND-05, REMIND-06, REMIND-07 quick-fix
 * 260705-q7w).
 *
 * Replaces the old destructive `aktif = false` deactivation on therapy
 * change. Visibility of a cuci-darah (capd/hd) reminder is now a PURE
 * function of the user's current `metodeTerapiAktif` vs the reminder's
 * `jenis` — evaluated at query time, never mutated into storage. This makes
 * switching therapy methods lossless and reversible: a reminder's own
 * `aktif` toggle (the user-facing enable/disable switch) is an entirely
 * orthogonal concern and is never touched by this module.
 *
 * No DB access here — pure functions only, so they're trivially unit
 * testable and safely reusable across services, repositories, and the
 * push-dispatch SQL layer.
 */

export type CuciDarahJenis = "capd" | "hd";

/**
 * activeCuciDarahJenis — maps a user's metodeTerapiAktif to the single
 * cuci-darah `jenis` value that should be visible for them.
 *
 * - 'CAPD' (any case) -> 'capd'
 * - 'HD' (any case) -> 'hd'
 * - 'Transplantasi' (any case), null, undefined, '', or any unrecognized
 *   value -> null (no cuci-darah reminders are relevant)
 */
export function activeCuciDarahJenis(
  metode: string | null | undefined,
): CuciDarahJenis | null {
  if (!metode) return null;
  const normalized = metode.toLowerCase();
  if (normalized === "capd") return "capd";
  if (normalized === "hd") return "hd";
  return null;
}

/**
 * isReminderVisibleForTherapy — whether a reminder of the given `jenis`
 * should be visible/active for a user whose active therapy is `metode`.
 *
 * - 'obat' reminders are ALWAYS visible, regardless of therapy method.
 * - 'capd'/'hd' reminders are visible only when they match the user's
 *   current active cuci-darah jenis (activeCuciDarahJenis(metode)).
 */
export function isReminderVisibleForTherapy(
  jenis: string,
  metode: string | null | undefined,
): boolean {
  if (jenis === "obat") return true;
  return jenis === activeCuciDarahJenis(metode);
}
