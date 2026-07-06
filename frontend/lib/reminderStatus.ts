/**
 * reminderStatus.ts — Shared grace-aware reminder due-state helper
 *
 * Centralizes the "is this reminder late yet?" logic that was previously
 * copy-pasted (as a local `isLate` boolean) across ObatCard, CuciDarahCard,
 * MedicationLogItem, and DialysisLogItem. A reminder that has just become
 * due should show a "Segera ..." call-to-action for a short grace window
 * before flipping to "Terlambat" — an instant "Terlambat" the moment the
 * clock ticks past `waktuPengingat` erodes trust in the reminder system
 * (quick-260707-8je item 1).
 */

/** Grace window (ms) after `waktuPengingat` before a reminder is truly overdue. */
export const OVERDUE_GRACE_MS = 2 * 60 * 1000;

export type ReminderDueState = "confirmed" | "menunggu" | "segera" | "terlambat";

interface GetReminderDueStateArgs {
  isConfirmed: boolean;
  status: string;
  waktuPengingat: string | Date;
  now?: Date;
}

export function getReminderDueState({
  isConfirmed,
  status,
  waktuPengingat,
  now,
}: GetReminderDueStateArgs): ReminderDueState {
  if (isConfirmed) return "confirmed";

  const nowDate = now ?? new Date();
  const dueDate = new Date(waktuPengingat);

  if (status !== "tertunda" || nowDate < dueDate) return "menunggu";

  const graceDeadline = new Date(dueDate.getTime() + OVERDUE_GRACE_MS);
  if (nowDate < graceDeadline) return "segera";

  return "terlambat";
}
