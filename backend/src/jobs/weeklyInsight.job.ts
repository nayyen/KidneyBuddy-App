/**
 * weeklyInsight.job.ts — Sunday 19:00 WIB weekly trend insight batch (AI-02)
 *
 * Mirrors dailySummary.job.ts's injectable-core shape (generic
 * `_runWeeklyInsightBatchCore<T>`, D-17 sequential loop, D-18 per-user
 * fault isolation) — no committed RED scaffold exists for this job, but the
 * same generate-or-cache + batch pattern established in dailySummary.job.ts
 * is reused for consistency (this plan's stated purpose: establish the
 * pattern 05-06 extends).
 */
import pino from "pino";
import { findAllActiveUsers } from "../repositories/user.repository.js";
import {
  generateAndCacheWeeklyInsight,
  type WeeklyInsightResult,
} from "../services/aiInsight.service.js";

const logger = pino({ name: "weeklyInsight.job" });
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// ~24 calls/min if every single user requires a fresh Groq call this cycle —
// safely under Groq's ~30 RPM free-tier ceiling for llama-3.3-70b-versatile (D-17).
export const GROQ_CALL_DELAY_MS = 2500;

export type WeeklyInsightBatchDeps<T> = {
  generateInsight: (userId: string) => Promise<T | null>;
  saveInsight: (userId: string, payload: T) => Promise<void>;
  logError: (userId: string, error: unknown) => void;
};

/**
 * Injectable core: iterates all users sequentially (D-17 no concurrency),
 * catching and logging per-user failures so one user's error never halts
 * the batch (D-18). `generateInsight` returning `null` means "skip — already
 * cached this week" and is not an error.
 */
export async function _runWeeklyInsightBatchCore<T>(
  userIds: string[],
  deps: WeeklyInsightBatchDeps<T>,
): Promise<void> {
  for (const userId of userIds) {
    try {
      const payload = await deps.generateInsight(userId);
      if (payload !== null) {
        await deps.saveInsight(userId, payload);
      }
    } catch (err) {
      deps.logError(userId, err);
    }
  }
}

/**
 * Production entry point — wires real deps. `generateAndCacheWeeklyInsight`
 * already owns the full cache-check + gather + narrate + disclaimer +
 * encrypt + upsert contract (D-16), so `saveInsight` here is a no-op.
 * Also called once at boot as an idempotent catch-up sweep (scheduler.ts) —
 * safe to re-run because a cache hit makes `generateInsight` return null
 * without any Groq call (Pitfall 2).
 */
export async function runWeeklyInsightBatch(): Promise<void> {
  const userIds = await findAllActiveUsers();

  logger.info({ count: userIds.length }, "starting Sunday 19:00 WIB weekly insight batch");

  await _runWeeklyInsightBatchCore<WeeklyInsightResult>(userIds, {
    generateInsight: async (userId) => {
      const result = await generateAndCacheWeeklyInsight(userId);
      if (!result.fromCache) {
        await sleep(GROQ_CALL_DELAY_MS); // D-17: delay only after an actual Groq call
      }
      return result;
    },
    saveInsight: async () => {
      // no-op — see comment above
    },
    logError: (userId, err) => {
      logger.error({ userId, err }, "weekly insight failed for user — skipping (D-18)");
    },
  });

  logger.info("Sunday 19:00 WIB weekly insight batch complete");
}
