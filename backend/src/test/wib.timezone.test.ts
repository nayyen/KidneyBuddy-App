/**
 * wib.timezone.test.ts — unit tests for the per-user device-timezone helpers
 * added in quick-260705-9n4 task 2 (localHHmm, localDayNameLower, localDateStr,
 * localDayBounds, localDateFromHHmm).
 *
 * Uses fixed reference instants so results are deterministic regardless of
 * when/where the test runner executes.
 *
 * Run: cd backend && node --import tsx --test src/test/wib.timezone.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  localHHmm,
  localDayNameLower,
  localDateStr,
  localDayBounds,
  localDateFromHHmm,
} from "../utils/wib.js";

// 2026-07-05T10:00:00Z — a Sunday in UTC.
const REF = new Date("2026-07-05T10:00:00.000Z");

describe("wib.ts — localHHmm", () => {
  it("computes HH:mm for Asia/Jakarta (UTC+7, no DST)", () => {
    // 10:00 UTC + 7h = 17:00 Jakarta
    assert.strictEqual(localHHmm("Asia/Jakarta", REF), "17:00");
  });

  it("computes HH:mm for Asia/Makassar (UTC+8, no DST)", () => {
    // 10:00 UTC + 8h = 18:00 Makassar
    assert.strictEqual(localHHmm("Asia/Makassar", REF), "18:00");
  });

  it("computes HH:mm for UTC itself", () => {
    assert.strictEqual(localHHmm("UTC", REF), "10:00");
  });
});

describe("wib.ts — localDayNameLower", () => {
  it("returns the Indonesian day name in lowercase for Asia/Jakarta", () => {
    // 2026-07-05 is a Sunday in UTC; still Sunday at 17:00 Jakarta (same day).
    assert.strictEqual(localDayNameLower("Asia/Jakarta", REF), "minggu");
  });

  it("rolls over to the next Indonesian day name when the local zone crosses midnight", () => {
    // 23:30 UTC on 2026-07-05 (a Sunday) is 06:30 on 2026-07-06 (Monday) in
    // a UTC+7 zone — must report "senin", not "minggu".
    const lateUtc = new Date("2026-07-05T23:30:00.000Z");
    assert.strictEqual(localDayNameLower("Asia/Jakarta", lateUtc), "senin");
  });
});

describe("wib.ts — localDateStr", () => {
  it("returns YYYY-MM-DD for the given timezone", () => {
    assert.strictEqual(localDateStr("Asia/Jakarta", REF), "2026-07-05");
  });

  it("rolls the calendar date forward across the UTC+7 midnight boundary", () => {
    const lateUtc = new Date("2026-07-05T23:30:00.000Z");
    assert.strictEqual(localDateStr("Asia/Jakarta", lateUtc), "2026-07-06");
  });
});

describe("wib.ts — localDayBounds", () => {
  it("produces a 24h span whose start is midnight local time", () => {
    const { start, end } = localDayBounds("Asia/Jakarta", "2026-07-05");
    // Local midnight 2026-07-05T00:00 Jakarta (UTC+7) == 2026-07-04T17:00:00Z
    assert.strictEqual(start.toISOString(), "2026-07-04T17:00:00.000Z");
    assert.strictEqual(end.getTime() - start.getTime(), 24 * 3600 * 1000 - 1);
  });
});

describe("wib.ts — localDateFromHHmm", () => {
  it("builds the correct UTC instant for a local wall-clock time", () => {
    // 07:00 local Jakarta on 2026-07-05 == 2026-07-04T24:00-7h... i.e. 00:00Z 2026-07-05
    const d = localDateFromHHmm("Asia/Jakarta", "07:00", "2026-07-05");
    assert.strictEqual(d.toISOString(), "2026-07-05T00:00:00.000Z");
  });

  it("matches wibDateFromHHmm-equivalent behavior for Asia/Jakarta", () => {
    const d = localDateFromHHmm("Asia/Jakarta", "12:30", "2026-07-05");
    // 12:30 Jakarta (UTC+7) == 05:30 UTC
    assert.strictEqual(d.toISOString(), "2026-07-05T05:30:00.000Z");
  });
});
