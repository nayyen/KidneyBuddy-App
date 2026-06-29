/**
 * scheduler.ts — node-cron registration + boot catch-up
 *
 * Runs dispatchDueReminders once immediately at boot (catch-up for anything
 * missed while the process was down), then schedules both jobs every minute.
 * State lives in Postgres queried each tick — no in-memory schedule array
 * (addresses T-02-06-01: reminders survive restarts).
 */
import { schedule } from "node-cron";
import pino from "pino";
import { dispatchDueReminders } from "./reminderDispatch.job.js";
import { sendFollowUpReminders } from "./reminderFollowUp.job.js";
import { dispatchActivityEndReminders } from "./activityEndReminder.job.js";

const logger = pino({ name: "scheduler" });

export function startScheduler(): void {
  // Boot catch-up: dispatch anything that was due while the server was down
  dispatchDueReminders().catch((err) =>
    logger.error({ err }, "boot catch-up dispatch failed"),
  );
  dispatchActivityEndReminders().catch((err) =>
    logger.error({ err }, "boot catch-up activity end dispatch failed"),
  );

  // Every minute: dispatch due reminders
  schedule("* * * * *", () => {
    dispatchDueReminders().catch((err) =>
      logger.error({ err }, "scheduled dispatch failed"),
    );
  });

  // Every minute: send follow-up for unconfirmed doses (30-min threshold checked inside)
  schedule("* * * * *", () => {
    sendFollowUpReminders().catch((err) =>
      logger.error({ err }, "follow-up job failed"),
    );
  });

  // Every minute: dispatch activity end reminders for berlangsung activities
  // past their estimasiSelesai (ACTIVITY-02, restart-safe via DB query)
  schedule("* * * * *", () => {
    dispatchActivityEndReminders().catch((err) =>
      logger.error({ err }, "activity end dispatch failed"),
    );
  });

  logger.info("scheduler started — reminders, follow-ups, activity end reminders every minute");
}
