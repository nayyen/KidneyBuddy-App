/**
 * syncEvents.ts — Canonical cross-page sync event names (quick-260705-9n4 task 5)
 *
 * The app synchronizes state across /beranda, /catatan, and /pengingat purely
 * via `window` CustomEvents (no shared client-side store) — a mutation on any
 * one page dispatches an event, and every card/list that displays that data
 * subscribes and refetches. Centralizing the literal event-name strings here
 * means a dispatcher and a listener can never silently drift out of sync via
 * a typo (e.g. "obat:confirmed" vs "obat:confirm") — always import from here.
 *
 * Canonical set:
 * - FLUID_SAVED        — a fluid_log entry was created/edited/deleted
 * - OBAT_CONFIRMED     — a medication_log entry was confirmed/unconfirmed
 * - CUCIDARAH_CONFIRMED — a dialysis_log entry was confirmed/unconfirmed
 * - REMINDER_UPDATED   — a reminder_schedule row was created/edited/deleted
 * - ACTIVITY_SAVED     — a daily_activity was started/completed/edited/deleted
 * - LAB_SAVED          — a lab_result was created/edited/deleted/restored
 * - ACTIVITY_START     — request to open the "Mulai Kegiatan" sheet (AppShell-hosted)
 * - ACTIVITY_COMPLETE  — request to open the "Feelings Rating" sheet for a given activity
 * - LAB_OPEN           — request to open the "Catat Lab" sheet (AppShell-hosted)
 */
export const SYNC_EVENTS = {
  FLUID_SAVED: "fluid:saved",
  OBAT_CONFIRMED: "obat:confirmed",
  CUCIDARAH_CONFIRMED: "cucidarah:confirmed",
  REMINDER_UPDATED: "reminder:updated",
  ACTIVITY_SAVED: "activity:saved",
  LAB_SAVED: "lab:saved",
  ACTIVITY_START: "activity:start",
  ACTIVITY_COMPLETE: "activity:complete",
  LAB_OPEN: "lab:open",
} as const;

export type SyncEventName = (typeof SYNC_EVENTS)[keyof typeof SYNC_EVENTS];

/** Dispatch a canonical sync event on `window`, optionally with a detail payload. */
export function dispatchSyncEvent(name: SyncEventName, detail?: unknown): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(detail !== undefined ? new CustomEvent(name, { detail }) : new CustomEvent(name));
}
