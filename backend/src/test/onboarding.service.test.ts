import { describe, it } from "node:test";
import assert from "node:assert";
import {
  therapySchema,
  reminderSchema,
} from "../services/onboarding.service.js";
import { therapyList } from "../config/therapyContent.js";

describe("onboarding.service", () => {
  // Schema validation
  it("should accept valid therapy values", () => {
    const result = therapySchema.parse({ therapy: "CAPD" });
    assert.strictEqual(result.therapy, "CAPD");
  });

  it("should accept HD therapy", () => {
    const result = therapySchema.parse({ therapy: "HD" });
    assert.strictEqual(result.therapy, "HD");
  });

  it("should accept Transplantasi therapy", () => {
    const result = therapySchema.parse({ therapy: "Transplantasi" });
    assert.strictEqual(result.therapy, "Transplantasi");
  });

  it("should reject invalid therapy value", () => {
    assert.throws(() => therapySchema.parse({ therapy: "INVALID" }));
  });

  it("should validate reminder schema", () => {
    const result = reminderSchema.parse({
      jenis: "obat",
      nama: "Obat tekanan darah",
      jamPengingat: "08:00",
    });
    assert.strictEqual(result.jenis, "obat");
  });

  it("should reject reminder without nama", () => {
    assert.throws(() =>
      reminderSchema.parse({
        jenis: "capd",
        jamPengingat: "12:00",
      }),
    );
  });

  // Therapy content
  it("should export all three therapies", () => {
    assert.strictEqual(therapyList.length, 3);
    const ids = therapyList.map((t) => t.id);
    assert.ok(ids.includes("CAPD"));
    assert.ok(ids.includes("HD"));
    assert.ok(ids.includes("Transplantasi"));
  });

  it("should have correct DESIGN_SYSTEM colors", () => {
    const capd = therapyList.find((t) => t.id === "CAPD");
    const hd = therapyList.find((t) => t.id === "HD");
    const tx = therapyList.find((t) => t.id === "Transplantasi");
    assert.strictEqual(capd?.warna, "#2a9d8f");
    assert.strictEqual(hd?.warna, "#ef9f27");
    assert.strictEqual(tx?.warna, "#6b5ca5");
  });

  it("should have non-empty penjelasan for each therapy", () => {
    for (const t of therapyList) {
      assert.ok(t.penjelasan.length > 20, `${t.id} missing penjelasan`);
    }
  });

  // Progress logic unit tests
  it("should indicate step 0 for new users", () => {
    const progress = {
      onboardingComplete: false,
      lastCompletedStep: 0,
      reminderConfigured: false,
    };
    assert.strictEqual(progress.lastCompletedStep, 0);
    assert.strictEqual(progress.onboardingComplete, false);
  });

  it("should indicate step 1 after therapy selection", () => {
    const progress = {
      onboardingComplete: false,
      lastCompletedStep: 1,
      reminderConfigured: false,
    };
    assert.strictEqual(progress.lastCompletedStep, 1);
  });

  it("should detect completed onboarding with reminder", () => {
    const progress = {
      onboardingComplete: true,
      lastCompletedStep: 2,
      reminderConfigured: true,
    };
    assert.strictEqual(progress.onboardingComplete, true);
    assert.strictEqual(progress.reminderConfigured, true);
  });

  it("should detect completed onboarding without reminder (skipped)", () => {
    const progress = {
      onboardingComplete: true,
      lastCompletedStep: 2,
      reminderConfigured: false,
    };
    assert.strictEqual(progress.onboardingComplete, true);
    assert.strictEqual(progress.reminderConfigured, false);
  });
});
