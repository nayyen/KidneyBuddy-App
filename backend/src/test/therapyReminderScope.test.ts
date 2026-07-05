/**
 * therapyReminderScope.test.ts — unit tests for the pure therapy-vs-jenis
 * reminder scoping helpers (quick-260705-q7w).
 *
 * Run: cd backend && node --import tsx --test src/test/therapyReminderScope.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  activeCuciDarahJenis,
  isReminderVisibleForTherapy,
} from "../lib/therapyReminderScope.js";

describe("activeCuciDarahJenis", () => {
  it("maps CAPD -> 'capd'", () => {
    assert.strictEqual(activeCuciDarahJenis("CAPD"), "capd");
  });

  it("maps HD -> 'hd'", () => {
    assert.strictEqual(activeCuciDarahJenis("HD"), "hd");
  });

  it("maps Transplantasi -> null", () => {
    assert.strictEqual(activeCuciDarahJenis("Transplantasi"), null);
  });

  it("maps null/undefined/'' -> null", () => {
    assert.strictEqual(activeCuciDarahJenis(null), null);
    assert.strictEqual(activeCuciDarahJenis(undefined), null);
    assert.strictEqual(activeCuciDarahJenis(""), null);
  });

  it("is case-insensitive on input", () => {
    assert.strictEqual(activeCuciDarahJenis("capd"), "capd");
    assert.strictEqual(activeCuciDarahJenis("hd"), "hd");
    assert.strictEqual(activeCuciDarahJenis("transplantasi"), null);
    assert.strictEqual(activeCuciDarahJenis("Hd"), "hd");
  });
});

describe("isReminderVisibleForTherapy", () => {
  it("obat is always visible regardless of therapy method", () => {
    assert.strictEqual(isReminderVisibleForTherapy("obat", "CAPD"), true);
    assert.strictEqual(isReminderVisibleForTherapy("obat", "HD"), true);
    assert.strictEqual(isReminderVisibleForTherapy("obat", "Transplantasi"), true);
    assert.strictEqual(isReminderVisibleForTherapy("obat", null), true);
  });

  it("capd is visible only under CAPD", () => {
    assert.strictEqual(isReminderVisibleForTherapy("capd", "CAPD"), true);
    assert.strictEqual(isReminderVisibleForTherapy("capd", "HD"), false);
  });

  it("hd is visible only under HD", () => {
    assert.strictEqual(isReminderVisibleForTherapy("hd", "HD"), true);
    assert.strictEqual(isReminderVisibleForTherapy("hd", "CAPD"), false);
  });

  it("neither capd nor hd is visible under Transplantasi", () => {
    assert.strictEqual(isReminderVisibleForTherapy("capd", "Transplantasi"), false);
    assert.strictEqual(isReminderVisibleForTherapy("hd", "Transplantasi"), false);
  });
});
