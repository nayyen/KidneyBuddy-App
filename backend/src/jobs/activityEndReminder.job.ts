/**
 * activityEndReminder.job.ts — ACTIVITY-02: positively-framed push when an
 * activity's estimasiSelesai has passed and it's still "berlangsung"
 *
 * Every minute, queries Postgres for berlangsung activities where
 * estimasiSelesai <= now AND reminderSent = false, and sends a push
 * notification with the duration past the estimate — framed as
 * "Masih aktif · X menit lebih" (never "terlambat" or an alarm).
 *
 * _dispatchCore accepts injected deps for unit testing.
 * State is in Postgres (restart-safe) via reminderSent dedupe.
 */
import pino from "pino";
import {
  findDueForEndReminder,
  markReminderSent,
} from "../repositories/dailyActivity.repository.js";
import { sendToAllDevices, type NotificationPayload } from "../services/notification.service.js";

const logger = pino({ name: "activityEndReminder.job" });

// WIB offset for duration calculation
const WIB_OFFSET_MS = 7 * 3600 * 1000;

/**
 * Format a duration in minutes to a readable Indonesian string.
 * Examples: "2 menit", "1 jam 15 menit", "3 jam"
 */
function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} menit`;
  if (minutes === 0) return `${hours} jam`;
  return `${hours} jam ${minutes} menit`;
}

export type ActivityEndDeps = {
  findDue: (windowStart: Date, windowEnd: Date) => Promise<unknown[]>;
  markSent: (id: string) => Promise<void>;
  sendToAll: (userId: string, payload: NotificationPayload) => Promise<void>;
};

export async function _dispatchActivityEndCore(
  now: Date,
  deps: ActivityEndDeps,
): Promise<void> {
  // Window: find all berlangsung activities whose estimasiSelesai is before now
  // (reminderSent=false is enforced by the repository query)
  // Use a 24-hour window to catch any activities that may have been missed
  // during a backend restart. After 24h past the end time, the reminder won't fire.
  const windowStart = new Date(now.getTime() - 24 * 3600 * 1000);
  const windowEnd = now;

  const due = await deps.findDue(windowStart, windowEnd);
  if (due.length === 0) return;

  logger.info({ count: due.length }, "dispatching activity end reminders");

  for (const activity of due as any[]) {
    try {
      // Calculate how long past the estimated end time
      const estimasiSelesai = activity.estimasiSelesai instanceof Date
        ? activity.estimasiSelesai.getTime()
        : new Date(activity.estimasiSelesai).getTime();
      const pastMs = now.getTime() - estimasiSelesai;
      const pastMinutes = Math.max(1, Math.floor(pastMs / 60000));
      const durationStr = formatDuration(pastMinutes);

      // quick-260705-r8b bug 3 (backend): copy calmed to explicitly invite
      // the user to confirm/complete the activity, instead of only stating
      // elapsed duration — matches the gentler second follow-up's tone.
      await deps.sendToAll(activity.userId, {
        title: "Kegiatan Hampir Selesai",
        body: `${activity.namaKegiatan} sudah sampai estimasi waktunya (${durationStr} lebih). Tandai selesai kalau sudah, ya.`,
        url: "/aktivitas",
      });

      await deps.markSent(activity.id);
      logger.info(
        { activityId: activity.id, userId: activity.userId, pastMinutes },
        "activity end reminder dispatched",
      );
    } catch (err) {
      // Per-activity errors must not abort the batch
      logger.error(
        { activityId: activity.id, err },
        "failed to dispatch activity end reminder — skipping",
      );
    }
  }
}

export async function dispatchActivityEndReminders(): Promise<void> {
  return _dispatchActivityEndCore(new Date(), {
    findDue: findDueForEndReminder,
    markSent: markReminderSent,
    sendToAll: sendToAllDevices,
  });
}
