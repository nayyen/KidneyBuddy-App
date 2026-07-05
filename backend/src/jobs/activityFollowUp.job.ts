/**
 * activityFollowUp.job.ts — quick-260705-r8b bug 3 (backend): a SECOND,
 * gentler push sent ~10 minutes after estimasiSelesai if the activity is
 * still "berlangsung" — a softer nudge on top of the immediate push already
 * sent by activityEndReminder.job.ts when estimasiSelesai was first reached.
 *
 * Every minute, queries Postgres for berlangsung activities whose
 * estimasiSelesai is <= (now - 10min), whose FIRST push already fired
 * (reminderSent = true), and whose follow-up has not yet fired
 * (followUpSent = false).
 *
 * _dispatchActivityFollowUpCore accepts injected deps for unit testing.
 * State is in Postgres (restart-safe) via followUpSent dedupe — same
 * pattern as activityEndReminder.job.ts's reminderSent dedupe.
 */
import pino from "pino";
import {
  findDueForFollowUp,
  markFollowUpSent,
} from "../repositories/dailyActivity.repository.js";
import { sendToAllDevices, type NotificationPayload } from "../services/notification.service.js";

const logger = pino({ name: "activityFollowUp.job" });

const FOLLOW_UP_DELAY_MS = 10 * 60 * 1000; // 10 minutes after estimasiSelesai

export type ActivityFollowUpDeps = {
  findDue: (windowStart: Date, windowEnd: Date) => Promise<unknown[]>;
  markSent: (id: string) => Promise<void>;
  sendToAll: (userId: string, payload: NotificationPayload) => Promise<void>;
};

export async function _dispatchActivityFollowUpCore(
  now: Date,
  deps: ActivityFollowUpDeps,
): Promise<void> {
  // Window: berlangsung activities whose estimasiSelesai is at least 10min
  // in the past (reminderSent=true/followUpSent=false enforced by the
  // repository query). Use a 24-hour window (matching activityEndReminder's
  // pattern) to catch anything missed during a backend restart.
  const windowEnd = new Date(now.getTime() - FOLLOW_UP_DELAY_MS);
  const windowStart = new Date(windowEnd.getTime() - 24 * 3600 * 1000);

  const due = await deps.findDue(windowStart, windowEnd);
  if (due.length === 0) return;

  logger.info({ count: due.length }, "dispatching activity follow-up reminders");

  for (const activity of due as any[]) {
    try {
      await deps.sendToAll(activity.userId, {
        title: "Masih Berlangsung?",
        body: `${activity.namaKegiatan} masih tercatat aktif. Kalau sudah selesai, tandai selesai, ya.`,
        url: "/aktivitas",
      });

      await deps.markSent(activity.id);
      logger.info(
        { activityId: activity.id, userId: activity.userId },
        "activity follow-up reminder dispatched",
      );
    } catch (err) {
      // Per-activity errors must not abort the batch
      logger.error(
        { activityId: activity.id, err },
        "failed to dispatch activity follow-up reminder — skipping",
      );
    }
  }
}

export async function sendActivityFollowUp(): Promise<void> {
  return _dispatchActivityFollowUpCore(new Date(), {
    findDue: findDueForFollowUp,
    markSent: markFollowUpSent,
    sendToAll: sendToAllDevices,
  });
}
