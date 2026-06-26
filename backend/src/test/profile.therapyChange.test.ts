import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { changeTherapySchema } from "../services/profile.service.js";
import { therapyList } from "../config/therapyContent.js";

// ─── Schema Validation Tests ──────────────────────────────────────────

describe("profile.service — changeTherapySchema", () => {
  it("should accept CAPD with confirmed: true", () => {
    const result = changeTherapySchema.parse({
      newMethod: "CAPD",
      confirmed: true,
    });
    assert.strictEqual(result.newMethod, "CAPD");
  });

  it("should accept HD with confirmed: true", () => {
    const result = changeTherapySchema.parse({
      newMethod: "HD",
      confirmed: true,
    });
    assert.strictEqual(result.newMethod, "HD");
  });

  it("should accept Transplantasi with confirmed: true", () => {
    const result = changeTherapySchema.parse({
      newMethod: "Transplantasi",
      confirmed: true,
    });
    assert.strictEqual(result.newMethod, "Transplantasi");
  });

  it("should reject invalid therapy method", () => {
    assert.throws(() =>
      changeTherapySchema.parse({ newMethod: "YOGA", confirmed: true }),
    );
  });

  it("should reject confirmed: false", () => {
    assert.throws(() =>
      changeTherapySchema.parse({ newMethod: "CAPD", confirmed: false }),
    );
  });

  it("should reject confirmed: string instead of boolean literal true", () => {
    assert.throws(() =>
      changeTherapySchema.parse({ newMethod: "CAPD", confirmed: "yes" }),
    );
  });

  it("should reject missing confirmed field", () => {
    assert.throws(() =>
      (changeTherapySchema as any).parse({ newMethod: "CAPD" }),
    );
  });
});

// ─── Therapy Content Config ───────────────────────────────────────────

describe("profile.service — therapy list config", () => {
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
});
