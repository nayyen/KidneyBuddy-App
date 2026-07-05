/**
 * reminderNotificationCopy.test.ts — unit tests for shared jenis-aware
 * notification copy helpers (quick-260705-p9y).
 *
 * Run: cd backend && node --import tsx --test src/test/reminderNotificationCopy.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  jenisEmoji,
  jenisLabel,
  jenisFollowUpNoun,
} from "../lib/reminderNotificationCopy.js";

describe("jenisEmoji", () => {
  it("returns the medication emoji for 'obat'", () => {
    assert.strictEqual(jenisEmoji("obat"), "💊");
  });

  it("returns the CAPD emoji for 'capd'", () => {
    assert.strictEqual(jenisEmoji("capd"), "💧");
  });

  it("returns the HD emoji for 'hd'", () => {
    assert.strictEqual(jenisEmoji("hd"), "🩸");
  });

  it("falls back to a bell emoji for an unknown jenis", () => {
    assert.strictEqual(jenisEmoji("unknown"), "🔔");
  });
});

describe("jenisLabel", () => {
  it("returns 'Obat' for 'obat'", () => {
    assert.strictEqual(jenisLabel("obat"), "Obat");
  });

  it("returns 'Cuci Darah' for 'capd'", () => {
    assert.strictEqual(jenisLabel("capd"), "Cuci Darah");
  });

  it("returns 'Cuci Darah' for 'hd'", () => {
    assert.strictEqual(jenisLabel("hd"), "Cuci Darah");
  });

  it("falls back to 'Pengingat' for an unknown jenis", () => {
    assert.strictEqual(jenisLabel("unknown"), "Pengingat");
  });
});

describe("jenisFollowUpNoun", () => {
  it("returns 'minum obat ini' for 'obat'", () => {
    assert.strictEqual(jenisFollowUpNoun("obat"), "minum obat ini");
  });

  it("returns 'sesi cuci darah ini' for 'capd'", () => {
    assert.strictEqual(jenisFollowUpNoun("capd"), "sesi cuci darah ini");
  });

  it("returns 'sesi cuci darah ini' for 'hd'", () => {
    assert.strictEqual(jenisFollowUpNoun("hd"), "sesi cuci darah ini");
  });

  it("falls back to 'pengingat ini' for an unknown jenis", () => {
    assert.strictEqual(jenisFollowUpNoun("unknown"), "pengingat ini");
  });
});
