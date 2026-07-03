/**
 * aiDisclaimer.test.ts — GREEN (05-01 Task 2 already implements the lib)
 *
 * Covers AI-05/D-19: the fixed medical disclaimer is appended unconditionally
 * regardless of LLM output content. Should PASS immediately since
 * aiDisclaimer.ts is created in this same plan (05-01).
 *
 * Run: cd backend && node --import tsx --test src/test/aiDisclaimer.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AI_DISCLAIMER, appendDisclaimer } from "../lib/aiDisclaimer.js";

describe("appendDisclaimer (AI-05, D-19)", () => {
  it("appends the exact AI_DISCLAIMER string to arbitrary narrative text", () => {
    const result = appendDisclaimer("x");
    assert.ok(result.endsWith(AI_DISCLAIMER));
    assert.strictEqual(result, `x\n\n${AI_DISCLAIMER}`);
  });

  it("appends the disclaimer even if the narrative already contains disclaimer-like text", () => {
    const narrative = "Ringkasan Anda hari ini baik. Selalu konsultasikan dengan dokter Anda.";
    const result = appendDisclaimer(narrative);
    assert.ok(result.endsWith(AI_DISCLAIMER));
    // The disclaimer must be present as a distinct trailing block, not deduplicated away.
    assert.strictEqual(result, `${narrative}\n\n${AI_DISCLAIMER}`);
  });

  it("appends the disclaimer even for empty narrative text", () => {
    const result = appendDisclaimer("");
    assert.strictEqual(result, `\n\n${AI_DISCLAIMER}`);
  });

  it("AI_DISCLAIMER matches the verbatim UI-SPEC Copywriting Contract string", () => {
    assert.strictEqual(
      AI_DISCLAIMER,
      "Ringkasan ini dibuat otomatis oleh AI dan tidak menggantikan saran medis profesional. " +
        "Selalu konsultasikan kondisi Anda dengan dokter atau tenaga kesehatan.",
    );
  });
});
