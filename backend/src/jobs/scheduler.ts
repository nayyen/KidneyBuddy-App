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
import { runAnomalyDetectionBatch } from "./anomalyDetection.job.js";
import { runDailySummaryBatch } from "./dailySummary.job.js";
import { runWeeklyInsightBatch } from "./weeklyInsight.job.js";
import { wibHHmm, wibDayNameLower } from "../utils/wib.js";

const logger = pino({ name: "scheduler" });

export function startScheduler(): void {
  // Boot catch-up: dispatch anything that was due while the server was down
  dispatchDueReminders().catch((err) =>
    logger.error({ err }, "boot catch-up dispatch failed"),
  );
  dispatchActivityEndReminders().catch((err) =>
    logger.error({ err }, "boot catch-up activity end dispatch failed"),
  );
  // Boot catch-up for the 21:00 anomaly batch (ANOMALY-01): a different shape
  // than the reminder catch-up above (Pitfall 2) — this is safe to call
  // unconditionally because runAnomalyChecksForUser's own dedup
  // (findActiveByType) makes re-running it for a user who already has an
  // active alert of a given type a no-op, not a duplicate-fire.
  runAnomalyDetectionBatch().catch((err) =>
    logger.error({ err }, "boot catch-up anomaly batch failed"),
  );
  // Boot catch-up for the 20:00 daily summary (AI-01) and Sunday 19:00 weekly
  // insight (AI-02) batches — ONLY runs if the scheduled time has already
  // passed today (code review CR-04, 2026-07-04). The cache-hit no-op
  // (D-16/Pitfall 2) only guarantees no DUPLICATE Groq call, not that the
  // cached DATA is correct for the call time: a restart at, say, 09:00 WIB
  // would otherwise generate-and-permanently-cache a summary/insight
  // describing an incomplete day/week, which the real 20:00/Sunday-19:00
  // cron run would then see as a cache hit and silently never correct.
  if (wibHHmm() >= "20:00") {
    runDailySummaryBatch().catch((err) =>
      logger.error({ err }, "boot catch-up daily summary batch failed"),
    );
  }
  if (wibDayNameLower() === "minggu" && wibHHmm() >= "19:00") {
    runWeeklyInsightBatch().catch((err) =>
      logger.error({ err }, "boot catch-up weekly insight batch failed"),
    );
  }

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

  // 21:00 WIB daily: anomaly detection batch (ANOMALY-01, D-17 sequential
  // with inter-user delay, fixed-time job using node-cron's native timezone
  // option rather than the per-minute wibHHmm() string-match pattern, since
  // this cron time is fixed, not user-configurable).
  schedule(
    "0 21 * * *",
    () => {
      runAnomalyDetectionBatch().catch((err) =>
        logger.error({ err }, "anomaly batch job failed"),
      );
    },
    { timezone: "Asia/Jakarta" },
  );

  // 20:00 WIB daily: daily summary batch (AI-01, D-17 sequential with
  // inter-user delay, fixed-time job via node-cron's native timezone option).
  schedule(
    "0 20 * * *",
    () => {
      runDailySummaryBatch().catch((err) =>
        logger.error({ err }, "daily summary job failed"),
      );
    },
    { timezone: "Asia/Jakarta" },
  );

  // Sunday 19:00 WIB: weekly insight batch (AI-02, same D-17/D-18 shape).
  schedule(
    "0 19 * * 0",
    () => {
      runWeeklyInsightBatch().catch((err) =>
        logger.error({ err }, "weekly insight job failed"),
      );
    },
    { timezone: "Asia/Jakarta" },
  );

  logger.info(
    "scheduler started — reminders, follow-ups, activity end reminders every minute, anomaly batch daily at 21:00 WIB, daily summary at 20:00 WIB, weekly insight Sunday 19:00 WIB",
  );
}
