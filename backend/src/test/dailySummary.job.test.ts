/**
 * dailySummary.job.test.ts — TDD RED scaffold for D-17/D-18 batch fault isolation
 *
 * RED scaffold (05-01 Wave 0): references _runDailySummaryBatchCore from
 * dailySummary.job.js (NOT YET IMPLEMENTED). Plan 05-05 turns this GREEN.
 *
 * Covers D-17/D-18:
 *  - D-17: users are processed in a sequential loop (no concurrency).
 *  - D-18: if the Groq call fails/times out for one user mid-batch, that user
 *    is skipped (logged) and the loop continues to the next user — mirrors
 *    the Promise.allSettled-style fault isolation used in
 *    notification.service.ts's fanOut. NEVER calls the real Groq API here —
 *    always inject a fake generator function.
 *
 * Run: cd backend && node --import tsx --test src/test/dailySummary.job.test.ts
 * (Expected to FAIL/error at import time until 05-05 implements the module —
 * do not run this in a "must pass" verify gate in 05-01.)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Set ENCRYPTION_KEY before module imports — dailySummary.job.js now transitively
// imports aiSummary.service.js -> lib/encryption.js, which validates the key at
// module load time (same pattern as labResult.service.test.ts / fluid.service.test.ts).
// This test never exercises the real encrypt/decrypt path (it injects fake
// generateSummary/saveSummary deps directly into _runDailySummaryBatchCore), but the
// import chain still requires a syntactically valid key to avoid a load-time throw.
process.env.ENCRYPTION_KEY =
  "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3";

// ─── Import from unimplemented module (will fail — RED scaffold, GREEN in 05-05) ──
const { _runDailySummaryBatchCore } = await import("../jobs/dailySummary.job.js");

const USER_IDS = [
  "00000000-0000-0000-0000-000000000001",
  "00000000-0000-0000-0000-000000000002",
  "00000000-0000-0000-0000-000000000003",
];

describe("_runDailySummaryBatchCore (D-17 sequential loop, D-18 fault isolation)", () => {
  it("continues processing remaining users after one user's Groq call throws", async () => {
    const processed: string[] = [];
    const failedUserId = USER_IDS[1];

    // Fake Groq-backed summary generator — NEVER calls the real Groq API.
    const fakeGenerateSummary = async (userId: string) => {
      if (userId === failedUserId) {
        throw new Error("simulated Groq timeout");
      }
      return `Ringkasan untuk ${userId}`;
    };

    const fakeSaveSummary = async (userId: string, _text: string) => {
      processed.push(userId);
    };

    const errors: Array<{ userId: string; error: unknown }> = [];
    const fakeLogError = (userId: string, error: unknown) => {
      errors.push({ userId, error });
    };

    await _runDailySummaryBatchCore(USER_IDS, {
      generateSummary: fakeGenerateSummary,
      saveSummary: fakeSaveSummary,
      logError: fakeLogError,
    });

    // The two users whose generator did NOT throw must still be processed.
    assert.ok(processed.includes(USER_IDS[0]));
    assert.ok(processed.includes(USER_IDS[2]));
    // The failing user must NOT be saved, but the loop must not have thrown.
    assert.ok(!processed.includes(failedUserId));
    // The failure must be logged, not silently swallowed or fatal to the batch.
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].userId, failedUserId);
  });

  it("processes all users successfully when no Groq call fails", async () => {
    const processed: string[] = [];
    const fakeGenerateSummary = async (userId: string) => `Ringkasan untuk ${userId}`;
    const fakeSaveSummary = async (userId: string, _text: string) => {
      processed.push(userId);
    };
    const fakeLogError = () => {};

    await _runDailySummaryBatchCore(USER_IDS, {
      generateSummary: fakeGenerateSummary,
      saveSummary: fakeSaveSummary,
      logError: fakeLogError,
    });

    assert.deepStrictEqual(processed, USER_IDS);
  });
});
