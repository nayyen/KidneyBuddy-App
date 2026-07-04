/**
 * report.service.test.ts — TDD tests for REPORT-01 report aggregation
 *
 * RED scaffold (04-01 Wave 0): references _generateReportCore and
 * reportQuerySchema from report.service.js (NOT YET IMPLEMENTED).
 * These assertions MUST fail at this stage — they define the contract
 * that plan 04-03 must turn GREEN.
 *
 * Covers:
 *  - reportQuerySchema: valid range, reversed range (>400), exceeded 90 days
 *  - _generateReportCore: fluidSummary aggregation, medication adherence %,
 *    CAPD condition frequency, anomalies placeholder
 *
 * Run: cd backend && node --import tsx --test src/test/report.service.test.ts
 *
 * Pattern: injects in-memory fakes — no live Postgres needed.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Set ENCRYPTION_KEY before module imports (05-07 deviation) —
// report.service.js now transitively imports anomalyAlert.repository +
// lib/encryption.js for the real D-15 getAnomaliesByRangeForReport
// implementation, which validates the key at module load time (same
// pattern as dailySummary.job.test.ts / labResult.service.test.ts). This
// file's tests never exercise real encrypt/decrypt (in-memory fakes only),
// but the import chain still requires a syntactically valid key to avoid
// a load-time throw that would fail every test in this file, not just the
// pre-existing getCAPDFn-arity ones.
process.env.ENCRYPTION_KEY =
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

// ─── Import from unimplemented module (will fail — RED scaffold) ────────────
const { _generateReportCore, reportQuerySchema } = await import(
  "../services/report.service.js"
);

// ─── In-memory fake factory for report repository functions ──────────────────

function createFakeReportRepo() {
  /** getFluidSummaryByRange(userId, dari, sampai) → per-day rows */
  const getFluidSummaryByRange = async (
    _userId: string,
    _dari: string,
    _sampai: string,
  ) => [
    { tanggal: "2026-06-01", masuk: 1500, keluar: 1200 },
    { tanggal: "2026-06-02", masuk: 1800, keluar: 1500 },
    { tanggal: "2026-06-03", masuk: 2000, keluar: 1600 },
  ];

  /** getMedicationAdherenceByRange(userId, dari, sampai) → aggregated counts */
  const getMedicationAdherenceByRange = async (
    _userId: string,
    _dari: string,
    _sampai: string,
  ) => ({
    total: 10,
    confirmed: 8,
    byReminder: [
      { namaObat: "Obat A", total: 5, confirmed: 4 },
      { namaObat: "Obat B", total: 5, confirmed: 4 },
    ],
  });

  /** getCAPDConditionsByRange(userId, dari, sampai) → condition counts */
  const getCAPDConditionsByRange = async (
    _userId: string,
    _dari: string,
    _sampai: string,
  ) => ({
    jernih: 12,
    keruh: 2,
    keruh_gumpalan: 1,
    berdarah: 0,
  });

  return { getFluidSummaryByRange, getMedicationAdherenceByRange, getCAPDConditionsByRange };
}

const USER_ID = "00000000-0000-0000-0000-000000000001";

// ─── Schema validation ────────────────────────────────────────────────────────

describe("reportQuerySchema validation", () => {
  it("valid date range passes", () => {
    const result = reportQuerySchema.safeParse({
      dari: "2026-06-01",
      sampai: "2026-06-15",
    });
    assert.strictEqual(result.success, true);
  });

  it("reversed range (sampai < dari) is rejected", () => {
    const result = reportQuerySchema.safeParse({
      dari: "2026-06-15",
      sampai: "2026-06-01",
    });
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues[0].message.includes("setelah"));
    }
  });

  it("range exceeding 90 days is rejected", () => {
    const result = reportQuerySchema.safeParse({
      dari: "2026-01-01",
      sampai: "2026-05-01", // 120 days
    });
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues[0].message.includes("90"));
    }
  });

  it("malformed date (non-ISO) is rejected", () => {
    const result = reportQuerySchema.safeParse({
      dari: "01/06/2026",
      sampai: "15/06/2026",
    });
    assert.strictEqual(result.success, false);
  });
});

// ─── _generateReportCore ─────────────────────────────────────────────────────

describe("_generateReportCore aggregation", () => {
  it("returns correct fluid summary (totalIn, totalOut, balance)", async () => {
    const repo = createFakeReportRepo();
    const result = await _generateReportCore(
      USER_ID,
      "2026-06-01",
      "2026-06-03",
      repo.getFluidSummaryByRange,
      repo.getMedicationAdherenceByRange,
      repo.getCAPDConditionsByRange,
    );

    assert.ok(result.fluidSummary, "fluidSummary should exist");
    assert.strictEqual(result.fluidSummary.totalIn, 5300); // 1500+1800+2000
    assert.strictEqual(result.fluidSummary.totalOut, 4300); // 1200+1500+1600
    assert.strictEqual(result.fluidSummary.balance, 1000); // 5300-4300
    assert.ok(Array.isArray(result.fluidSummary.dailyBreakdown), "dailyBreakdown should be an array");
    assert.strictEqual(result.fluidSummary.dailyBreakdown.length, 3, "should have 3 days");
    const day1 = result.fluidSummary.dailyBreakdown[0];
    assert.strictEqual(day1.tanggal, "2026-06-01");
    assert.strictEqual(day1.totalIn, 1500);
    assert.strictEqual(day1.totalOut, 1200);
    assert.strictEqual(day1.selisih, 300, "day1: 1500-1200 = 300");
  });

  it("returns medication adherence with pct = (confirmed/total)*100", async () => {
    const repo = createFakeReportRepo();
    const result = await _generateReportCore(
      USER_ID,
      "2026-06-01",
      "2026-06-03",
      repo.getFluidSummaryByRange,
      repo.getMedicationAdherenceByRange,
      repo.getCAPDConditionsByRange,
    );

    assert.ok(result.medicationAdherence, "medicationAdherence should exist");
    assert.strictEqual(result.medicationAdherence.taken, 8);
    assert.strictEqual(result.medicationAdherence.scheduled, 10);
    assert.strictEqual(result.medicationAdherence.pct, 80); // (8/10)*100
  });

  it("returns 0% adherence when scheduled is 0 (no data path)", async () => {
    const emptyAdherence = async () => ({
      total: 0,
      confirmed: 0,
      byReminder: [],
    });

    const repo = createFakeReportRepo();
    const result = await _generateReportCore(
      USER_ID,
      "2026-06-01",
      "2026-06-03",
      repo.getFluidSummaryByRange,
      emptyAdherence,
      repo.getCAPDConditionsByRange,
    );

    assert.strictEqual(result.medicationAdherence.taken, 0);
    assert.strictEqual(result.medicationAdherence.scheduled, 0);
    assert.strictEqual(result.medicationAdherence.pct, 0);
  });

  it("returns CAPD condition frequency grouped by kondisiKeluar", async () => {
    const repo = createFakeReportRepo();
    const result = await _generateReportCore(
      USER_ID,
      "2026-06-01",
      "2026-06-03",
      repo.getFluidSummaryByRange,
      repo.getMedicationAdherenceByRange,
      repo.getCAPDConditionsByRange,
    );

    assert.ok(result.capdFrequency, "capdFrequency should exist");
    assert.strictEqual(result.capdFrequency.jernih, 12);
    assert.strictEqual(result.capdFrequency.keruh, 2);
    assert.strictEqual(result.capdFrequency.keruh_gumpalan, 1);
    assert.strictEqual(result.capdFrequency.berdarah, 0);
  });

  it("returns anomalies as empty array (Phase 4 placeholder)", async () => {
    const repo = createFakeReportRepo();
    const result = await _generateReportCore(
      USER_ID,
      "2026-06-01",
      "2026-06-03",
      repo.getFluidSummaryByRange,
      repo.getMedicationAdherenceByRange,
      repo.getCAPDConditionsByRange,
    );

    assert.ok(Array.isArray(result.anomalies));
    assert.strictEqual(result.anomalies.length, 0);
  });
});
