/**
 * dailySummary.job.ts — 20:00 WIB daily summary batch (AI-01)
 *
 * `_runDailySummaryBatchCore` is the exact injectable-core name/shape the
 * already-committed 05-01 RED scaffold (`dailySummary.job.test.ts`) commits
 * to as the binding contract: `_runDailySummaryBatchCore(userIds, { generateSummary,
 * saveSummary, logError })`, generic over the payload type `T` passed between
 * `generateSummary` and `saveSummary` (mirrors anomaly.controller.ts's
 * `AnomalyRepoDeps<T>` pattern from 05-03) — the test's simplified fake
 * (raw string payload) and production's `DailySummaryResult` object both
 * satisfy the same contract without either side needing a cast.
 *
 * `generateSummary` returning `null` means "skip — already handled" (a cache
 * hit during idempotent boot catch-up per Pitfall 2); this is NOT an error,
 * and `saveSummary` is not invoked in that case.
 *
 * Sequential loop with per-user try/catch + continue (D-18 fault isolation),
 * mirrors anomalyDetection.job.ts's `_anomalyBatchCore` shape.
 */
import pino from "pino";
import { findAllActiveUsers } from "../repositories/user.repository.js";
import {
  generateAndCacheDailySummary,
  type DailySummaryResult,
} from "../services/aiSummary.service.js";

const logger = pino({ name: "dailySummary.job" });
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// ~24 calls/min if every single user requires a fresh Groq call this cycle —
// safely under Groq's ~30 RPM free-tier ceiling for llama-3.3-70b-versatile (D-17).
export const GROQ_CALL_DELAY_MS = 2500;

export type DailySummaryBatchDeps<T> = {
  generateSummary: (userId: string) => Promise<T | null>;
  saveSummary: (userId: string, payload: T) => Promise<void>;
  logError: (userId: string, error: unknown) => void;
};

/**
 * Injectable core: iterates all users sequentially (D-17 no concurrency),
 * catching and logging per-user failures so one user's error never halts
 * the batch (D-18). NEVER calls the real Groq API directly — that only
 * happens inside the `generateSummary` dependency injected by the caller.
 */
export async function _runDailySummaryBatchCore<T>(
  userIds: string[],
  deps: DailySummaryBatchDeps<T>,
): Promise<void> {
  for (const userId of userIds) {
    try {
      const payload = await deps.generateSummary(userId);
      if (payload !== null) {
        await deps.saveSummary(userId, payload);
      }
    } catch (err) {
      deps.logError(userId, err);
    }
  }
}

/**
 * Production entry point — wires real deps. `generateAndCacheDailySummary`
 * already owns the full cache-check + gather + narrate + disclaimer +
 * encrypt + upsert contract (D-16), so `saveSummary` here is a no-op:
 * persistence already happened as a side effect inside `generateSummary`.
 * The two-step split exists solely to satisfy the already-committed 05-01
 * RED scaffold's exact call shape. Also called once at boot as an idempotent
 * catch-up sweep (scheduler.ts) — safe to re-run because a cache hit makes
 * `generateSummary` return null without any Groq call (Pitfall 2).
 */
export async function runDailySummaryBatch(): Promise<void> {
  const userIds = await findAllActiveUsers();

  logger.info({ count: userIds.length }, "starting 20:00 WIB daily summary batch");

  await _runDailySummaryBatchCore<DailySummaryResult>(userIds, {
    generateSummary: async (userId) => {
      const result = await generateAndCacheDailySummary(userId);
      if (!result.fromCache) {
        await sleep(GROQ_CALL_DELAY_MS); // D-17: delay only after an actual Groq call
      }
      return result;
    },
    saveSummary: async () => {
      // no-op — see comment above
    },
    logError: (userId, err) => {
      logger.error({ userId, err }, "daily summary failed for user — skipping (D-18)");
    },
  });

  logger.info("20:00 WIB daily summary batch complete");
}
