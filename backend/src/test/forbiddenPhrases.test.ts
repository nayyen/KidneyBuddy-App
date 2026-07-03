/**
 * forbiddenPhrases.test.ts — GREEN (05-01 Task 2 already implements the lib)
 *
 * Covers D-20: false-reassurance phrase detection + per-tipeAnomali static
 * fallback templates. Should PASS immediately since forbiddenPhrases.ts is
 * created in this same plan (05-01), unlike the RED scaffolds below it.
 *
 * Run: cd backend && node --import tsx --test src/test/forbiddenPhrases.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  containsForbiddenPhrase,
  STATIC_FALLBACK_TEMPLATES,
} from "../lib/forbiddenPhrases.js";

describe("containsForbiddenPhrase (D-20)", () => {
  it("detects a false-reassurance phrase (case-insensitive substring match)", () => {
    assert.strictEqual(
      containsForbiddenPhrase("Kondisi ini Tidak Perlu Khawatir, tetap pantau saja"),
      true,
    );
  });

  it("detects another forbidden phrase embedded mid-sentence", () => {
    assert.strictEqual(
      containsForbiddenPhrase("Perubahan ini aman saja dan tidak memerlukan tindakan"),
      true,
    );
  });

  it("returns false for a calm-but-serious sentence with no forbidden phrase", () => {
    assert.strictEqual(
      containsForbiddenPhrase(
        "Sistem mendeteksi penurunan volume cairan keluar yang signifikan. Segera hubungi dokter Anda.",
      ),
      false,
    );
  });
});

describe("STATIC_FALLBACK_TEMPLATES (D-20)", () => {
  const expectedTypes = [
    "kondisi_cairan_abnormal",
    "jadwal_terlewat",
    "penurunan_volume_keluar",
    "pola_asupan_menyimpang",
  ];

  for (const tipeAnomali of expectedTypes) {
    it(`has a non-empty template for tipeAnomali="${tipeAnomali}"`, () => {
      const template = STATIC_FALLBACK_TEMPLATES[tipeAnomali];
      assert.ok(typeof template === "string" && template.length > 0);
    });
  }
});
