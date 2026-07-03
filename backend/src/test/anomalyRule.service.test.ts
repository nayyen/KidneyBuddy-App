/**
 * anomalyRule.service.test.ts — TDD RED scaffold for ANOMALY-01 / ANOMALY-03
 *
 * RED scaffold (05-01 Wave 0): references four rule functions from
 * anomalyRule.service.js (NOT YET IMPLEMENTED). Plan 05-02 turns this GREEN.
 *
 * Covers D-01..D-04:
 *  - D-01: fluid-intake deviation is evaluated against the patient's OWN
 *    7-day rolling average, not a population baseline.
 *  - D-02: severity is FIXED per anomaly type, never dynamically scored.
 *    CAPD abnormal effluent and >2 missed schedules in a day => always
 *    "tinggi". Fluid-output decline and intake deviation => always "normal".
 *  - D-03: confidenceScore is computed entirely by the rule engine (e.g. how
 *    far a value exceeds its threshold), never by the LLM.
 *  - D-04: rules requiring historical data (3-day output decline, 7-day
 *    intake baseline) silently return null (no alert, no error) until enough
 *    history exists. CAPD-effluent and missed-schedule rules have no history
 *    requirement and are active from day one.
 *
 * Run: cd backend && node --import tsx --test src/test/anomalyRule.service.test.ts
 * (Expected to FAIL/error at import time until 05-02 implements the module —
 * do not run this in a "must pass" verify gate in 05-01.)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ─── Import from unimplemented module (will fail — RED scaffold, GREEN in 05-02) ──
const {
  checkCapdEffluentAnomaly,
  checkMissedSchedules,
  checkFluidOutputDecline,
  checkFluidIntakeDeviation,
} = await import("../services/anomalyRule.service.js");

// ─── D-02: CAPD abnormal effluent — always "tinggi", no history requirement ──

describe("checkCapdEffluentAnomaly (D-02, D-04 — no history requirement)", () => {
  it("fires for keruh (cloudy) effluent with severity tinggi", () => {
    const result = checkCapdEffluentAnomaly("keruh");
    assert.ok(result);
    assert.strictEqual(result.tipeAnomali, "kondisi_cairan_abnormal");
    assert.strictEqual(result.severity, "tinggi");
  });

  it("fires for berdarah (bloody) effluent with severity tinggi", () => {
    const result = checkCapdEffluentAnomaly("berdarah");
    assert.ok(result);
    assert.strictEqual(result.severity, "tinggi");
  });

  it("returns null for jernih (clear) effluent — normal condition", () => {
    const result = checkCapdEffluentAnomaly("jernih");
    assert.strictEqual(result, null);
  });
});

// ─── D-02: >2 missed schedules in a day — always "tinggi", no history requirement ──

describe("checkMissedSchedules (D-02, D-03, D-04 — no history requirement)", () => {
  it("returns null when missedCountToday <= 2 (threshold is MORE than 2)", () => {
    assert.strictEqual(checkMissedSchedules(0), null);
    assert.strictEqual(checkMissedSchedules(2), null);
  });

  it("fires with severity tinggi when missedCountToday > 2", () => {
    const result = checkMissedSchedules(3);
    assert.ok(result);
    assert.strictEqual(result.tipeAnomali, "jadwal_terlewat");
    assert.strictEqual(result.severity, "tinggi");
  });

  it("confidenceScore scales upward as missedCountToday increases (D-03)", () => {
    const lower = checkMissedSchedules(3);
    const higher = checkMissedSchedules(6);
    assert.ok(lower && higher);
    assert.ok(higher.confidenceScore > lower.confidenceScore);
    assert.ok(higher.confidenceScore <= 100);
  });
});

// ─── D-01/D-04: fluid-output decline — always "normal" severity, needs 3-day history ──

describe("checkFluidOutputDecline (D-02 normal severity, D-04 3-day history gate)", () => {
  it("silently returns null with fewer than 3 days of history", () => {
    const result = checkFluidOutputDecline([1500, 1400]);
    assert.strictEqual(result, null);
  });

  it("returns null when decline is below the 30% threshold", () => {
    // Prior baseline ~1500, recent 3-day avg only slightly lower — under 30% decline
    const result = checkFluidOutputDecline([1500, 1500, 1500, 1450, 1400, 1400]);
    assert.strictEqual(result, null);
  });

  it("fires with severity normal when decline is >= 30% over 3 consecutive days", () => {
    const result = checkFluidOutputDecline([1500, 1500, 1500, 900, 900, 900]);
    assert.ok(result);
    assert.strictEqual(result.tipeAnomali, "penurunan_volume_keluar");
    assert.strictEqual(result.severity, "normal");
  });
});

// ─── D-01/D-04: fluid-intake pattern deviation — always "normal", needs 7-day baseline ──

describe("checkFluidIntakeDeviation (D-01 personal baseline, D-02 normal severity, D-04 7-day gate)", () => {
  it("silently returns null with fewer than 7 days of history", () => {
    const result = checkFluidIntakeDeviation([1500, 1600, 1550, 1500, 1600]);
    assert.strictEqual(result, null);
  });

  it("returns null when today's intake matches the patient's own 7-day rolling average", () => {
    const history = [1500, 1550, 1500, 1600, 1550, 1500, 1520];
    const result = checkFluidIntakeDeviation(history);
    assert.strictEqual(result, null);
  });

  it("fires with severity normal when intake deviates significantly from the 7-day average", () => {
    const history = [1500, 1550, 1500, 1600, 1550, 1500, 2800];
    const result = checkFluidIntakeDeviation(history);
    assert.ok(result);
    assert.strictEqual(result.tipeAnomali, "pola_asupan_menyimpang");
    assert.strictEqual(result.severity, "normal");
  });
});
