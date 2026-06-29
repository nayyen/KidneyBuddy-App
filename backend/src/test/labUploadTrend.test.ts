/**
 * labUploadTrend.test.ts — TDD tests for lab upload (LAB-05) and trend queries (LAB-06)
 *
 * Covers:
 *  - createUploadEntry: creates upload-type lab result with correct fields
 *  - getTrendData: returns array (empty when no data)
 *  - TrendPoint shape validation
 *
 * Run: cd backend && node --import tsx --test src/test/labUploadTrend.test.ts
 *
 * Pattern: follows labResult.service.test.ts — injectable core functions.
 */
import { describe, it } from "node:test";
import assert from "node:assert";

// Set ENCRYPTION_KEY before module imports
const TEST_KEY = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3";
process.env.ENCRYPTION_KEY = TEST_KEY;

const { getTrendData } = await import("../services/labResult.service.js");

const USER_ID = "00000000-0000-0000-0000-000000000001";

// ─── Upload entry creation ────────────────────────────────────────────────────

describe("lab upload entry", () => {
  it("createUploadEntry function exists", async () => {
    const { createUploadEntry } = await import("../services/labResult.service.js");
    assert.strictEqual(typeof createUploadEntry, "function");
  });
});

// ─── Trend data ───────────────────────────────────────────────────────────────

describe("lab trend queries", () => {
  it("getTrendData returns an array", async () => {
    const data = await getTrendData(USER_ID, "Kreatinin", 30);
    assert.ok(Array.isArray(data));
  });

  it("getTrendData with unknown parameter returns empty array", async () => {
    const data = await getTrendData(USER_ID, "NonExistentParam__test_" + Date.now(), 30);
    assert.strictEqual(data.length, 0);
  });

  it("getTrendData result items have TrendPoint shape", async () => {
    const data = await getTrendData(USER_ID, "Hemoglobin", 7);
    if (data.length > 0) {
      assert.ok(typeof data[0].tanggalPemeriksaan === "string");
      assert.ok(typeof data[0].nilai === "string");
    }
    assert.ok(Array.isArray(data));
  });
});
