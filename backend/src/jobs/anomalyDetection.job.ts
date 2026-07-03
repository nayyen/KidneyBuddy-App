/**
 * anomalyDetection.job.ts — 21:00 WIB anomaly batch (ANOMALY-01)
 *
 * The rule evaluation itself is NOT a Groq call — every user's 4 rules run
 * cheaply and instantly inside runAnomalyChecksForUser(); only a FIRED rule
 * triggers the comparatively slow, rate-limited Groq explanation call. The
 * ~2.5s inter-user delay (D-17) keeps sequential Groq calls safely under the
 * documented ~30 RPM free-tier ceiling even if every user fires every rule.
 *
 * Sequential loop with per-user try/catch + continue (D-18 fault isolation),
 * copied from reminderDispatch.job.ts's shape — one user's failure never
 * stops the rest of the batch.
 *
 * _anomalyBatchCore accepts injected deps for unit testing (Node 20 has no
 * mock.module) — mirrors reminderDispatch.job.ts's _dispatchCore seam.
 */
import pino from "pino";
import { findAllActive } from "../repositories/user.repository.js";
import { runAnomalyChecksForUser } from "../services/anomalyOrchestrator.service.js";

const logger = pino({ name: "anomalyDetection.job" });
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ~24 calls/min if every single user fires an alert this cycle — safely
// under Groq's ~30 RPM free-tier ceiling for llama-3.3-70b-versatile (D-17).
export const GROQ_CALL_DELAY_MS = 2500;

export type AnomalyBatchDeps = {
  findUsers: () => Promise<Array<{ userId: string }>>;
  runChecks: (userId: string) => Promise<void>;
  delayMs: number;
};

/**
 * Injectable core: iterates all users sequentially, `await sleep(delayMs)`
 * between each (D-17 no-concurrency), catching and logging per-user failures
 * so one user's error never halts the batch (D-18).
 */
export async function _anomalyBatchCore(deps: AnomalyBatchDeps): Promise<void> {
  const users = await deps.findUsers();
  logger.info({ count: users.length }, "starting 21:00 WIB anomaly batch");

  for (const user of users) {
    try {
      await deps.runChecks(user.userId);
    } catch (err) {
      logger.error(
        { userId: user.userId, err },
        "anomaly batch check failed for user — skipping", // D-18
      );
    }
    await sleep(deps.delayMs);
  }

  logger.info("21:00 WIB anomaly batch complete");
}

/**
 * Production entry point — wires real repository/service deps. Also called
 * once at boot as a catch-up sweep (scheduler.ts): safe to re-run because
 * runAnomalyChecksForUser's own dedup (findActiveByType) makes re-evaluating
 * a user with an already-active alert of a given type a no-op (Pitfall 2).
 */
export async function runAnomalyDetectionBatch(): Promise<void> {
  return _anomalyBatchCore({
    findUsers: findAllActive,
    runChecks: runAnomalyChecksForUser,
    delayMs: GROQ_CALL_DELAY_MS,
  });
}
