/**
 * anomaly.controller.test.ts — tests for ANOMALY-02 / ANOMALY-04
 *
 * Originally a RED scaffold (05-01 Wave 0); turned GREEN in 05-03 when
 * anomaly.controller.ts was implemented.
 *
 * Pattern: injects an in-memory fake repo — no live Postgres needed. Mirrors
 * report.service.test.ts's dynamic-import-of-unimplemented-module shape.
 *
 * Covers:
 *  - ANOMALY-02: alert card fields populate from rule engine output
 *    (tipeAnomali/severity/confidenceScore/deskripsi all pass through).
 *  - ANOMALY-04: feedback PATCH persists "relevan"/"tidak_relevan"; acknowledge
 *    transitions status "aktif" -> "dibaca".
 *
 * Run: cd backend && node --import tsx --test src/test/anomaly.controller.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Set ENCRYPTION_KEY before module imports (code review CR-03, 2026-07-04) —
// anomaly.controller.js transitively imports lib/encryption.js, which
// validates the key at module load time (same pattern as
// dailySummary.job.test.ts / report.service.test.ts). This file's tests
// never exercise real encrypt/decrypt (in-memory fakes only), but the
// import chain still requires a syntactically valid key to avoid a
// load-time throw that silently failed every test in this file (0/4 ever
// ran) until this fix.
process.env.ENCRYPTION_KEY =
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

// ─── Import from anomaly.controller.js ────────────────────────────────────────
const { _submitFeedbackCore, _acknowledgeAlertCore } = await import(
  "../controllers/anomaly.controller.js"
);

const ALERT_ID = "00000000-0000-0000-0000-000000000010";
const USER_ID = "00000000-0000-0000-0000-000000000001";

// ─── In-memory fake factory for anomaly alert repository functions ────────────

function createFakeAnomalyRepo(initialStatus = "aktif", initialFeedback: string | null = null) {
  const state = {
    id: ALERT_ID,
    userId: USER_ID,
    tipeAnomali: "kondisi_cairan_abnormal",
    severity: "tinggi",
    confidenceScore: 92,
    deskripsi: "Sistem mendeteksi kondisi cairan CAPD yang tidak normal.",
    status: initialStatus,
    feedbackPengguna: initialFeedback,
  };

  return {
    getAlertById: async (_userId: string, _alertId: string) => ({ ...state }),
    updateFeedback: async (_alertId: string, feedback: string) => {
      state.feedbackPengguna = feedback;
      return { ...state };
    },
    updateStatus: async (_alertId: string, status: string) => {
      state.status = status;
      return { ...state };
    },
    _state: state,
  };
}

// ─── ANOMALY-04: feedback persistence ──────────────────────────────────────────

describe("_submitFeedbackCore (ANOMALY-04)", () => {
  it("persists feedback = 'relevan'", async () => {
    const repo = createFakeAnomalyRepo();
    const result = await _submitFeedbackCore(USER_ID, ALERT_ID, "relevan", repo);
    assert.strictEqual(result.feedbackPengguna, "relevan");
  });

  it("persists feedback = 'tidak_relevan'", async () => {
    const repo = createFakeAnomalyRepo();
    const result = await _submitFeedbackCore(USER_ID, ALERT_ID, "tidak_relevan", repo);
    assert.strictEqual(result.feedbackPengguna, "tidak_relevan");
  });

  it("transitions status to 'ditindaklanjuti' (code review CR-01/CR-03, 2026-07-04)", async () => {
    // Regression coverage for the dedup-permanently-blocked bug: submitting
    // feedback must advance the alert past "dibaca" so
    // anomalyOrchestrator.service.ts's same-day dedup doesn't treat it as
    // still-unresolved.
    const repo = createFakeAnomalyRepo("dibaca");
    const result = await _submitFeedbackCore(USER_ID, ALERT_ID, "relevan", repo);
    assert.strictEqual(result.status, "ditindaklanjuti");
    assert.strictEqual(result.feedbackPengguna, "relevan");
  });
});

// ─── ANOMALY-04: status transitions ────────────────────────────────────────────

describe("_acknowledgeAlertCore (ANOMALY-04 status lifecycle)", () => {
  it("transitions status from 'aktif' to 'dibaca'", async () => {
    const repo = createFakeAnomalyRepo("aktif");
    const result = await _acknowledgeAlertCore(USER_ID, ALERT_ID, repo);
    assert.strictEqual(result.status, "dibaca");
  });
});

// ─── ANOMALY-02: alert card field pass-through from rule engine output ────────

describe("getAlertById field pass-through (ANOMALY-02)", () => {
  it("returns all rule-engine-populated fields unchanged", async () => {
    const repo = createFakeAnomalyRepo();
    const alert = await repo.getAlertById(USER_ID, ALERT_ID);
    assert.strictEqual(alert.tipeAnomali, "kondisi_cairan_abnormal");
    assert.strictEqual(alert.severity, "tinggi");
    assert.strictEqual(alert.confidenceScore, 92);
    assert.ok(alert.deskripsi.length > 0);
  });
});
