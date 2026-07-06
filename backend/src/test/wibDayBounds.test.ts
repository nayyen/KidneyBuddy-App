/**
 * wibDayBounds.test.ts — pure, DB-free regression test for
 * quick-260707-0uc (fix findNextUpcoming's confirmed-today window using the
 * container's local/UTC day instead of the patient's WIB calendar day).
 *
 * Covers the WIB day-bounds helper's boundary behavior with deterministic
 * explicit dateStr inputs, plus the two live-bug scenarios: a confirmation
 * from yesterday-evening WIB must fall BEFORE today's WIB window start, and
 * an early-morning-WIB confirmation must fall WITHIN today's WIB window.
 *
 * Run: cd backend && node --import tsx --test src/test/wibDayBounds.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { wibDayBounds } from "../utils/wib.js";

describe("wibDayBounds — quick-260707-0uc", () => {
  it("returns UTC instants for 00:00:00.000 and 23:59:59.999 WIB of the given calendar day", () => {
    const { start, end } = wibDayBounds("2026-07-07");
    assert.equal(start.toISOString(), "2026-07-06T17:00:00.000Z");
    assert.equal(end.toISOString(), "2026-07-07T16:59:59.999Z");
  });

  it("spans exactly 24h minus 1ms", () => {
    const { start, end } = wibDayBounds("2026-07-07");
    assert.equal(end.getTime() - start.getTime(), 86_400_000 - 1);
  });

  it("does NOT include a confirmation from yesterday-evening WIB (Monday 07:25 WIB) inside Tuesday's WIB-day window", () => {
    // Monday 2026-07-06 07:25 WIB === 2026-07-06T00:25:00.000Z
    const confirmedAt = new Date("2026-07-06T00:25:00.000Z");
    const { start } = wibDayBounds("2026-07-07");
    assert.ok(
      confirmedAt.getTime() < start.getTime(),
      "yesterday-evening-WIB confirmation must be BEFORE today's WIB window start",
    );
  });

  it("DOES include an early-morning-WIB confirmation (05:00 WIB) inside the same WIB-day window", () => {
    // 2026-07-06 05:00 WIB === 2026-07-05T22:00:00.000Z
    const confirmedAt = new Date("2026-07-05T22:00:00.000Z");
    const { start, end } = wibDayBounds("2026-07-06");
    assert.ok(
      confirmedAt.getTime() >= start.getTime() && confirmedAt.getTime() <= end.getTime(),
      "early-morning-WIB confirmation must be WITHIN today's WIB window",
    );
  });

  it("default-arg call (no dateStr) returns a valid 24h-minus-1ms window (smoke check)", () => {
    const { start, end } = wibDayBounds();
    assert.ok(end.getTime() > start.getTime());
    assert.equal(end.getTime() - start.getTime(), 86_400_000 - 1);
  });
});
