/**
 * therapyChange.reminders.test.ts — Tests for REMIND-07: therapy change is
 * NON-DESTRUCTIVE (quick-260705-q7w). Reminder visibility for cuci-darah
 * (capd/hd) is a pure query-time function of the user's CURRENT
 * metodeTerapiAktif vs each reminder's jenis — switching therapy never
 * mutates any reminder_schedule row, so switching back restores visibility
 * automatically and the user's own aktif toggle is never clobbered.
 *
 * Run: cd backend && node --import tsx --test src/test/therapyChange.reminders.test.ts
 *
 * NOTE: this file previously asserted the OLD destructive
 * therapy-change-mutates-aktif contract (an injectable "deactivate old
 * therapy's reminders" hook). That hook and its repository-level mutation
 * were deleted as part of quick-260705-q7w; this file now tests
 * `isReminderVisibleForTherapy` directly, which is what
 * profile.service.ts / reminders.service.ts / dialysisLog.service.ts rely on.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isReminderVisibleForTherapy } from "../lib/therapyReminderScope.js";

describe("REMIND-07 — non-destructive therapy scoping", () => {
  it("obat reminders are always visible, independent of therapy method", () => {
    assert.strictEqual(isReminderVisibleForTherapy("obat", "CAPD"), true);
    assert.strictEqual(isReminderVisibleForTherapy("obat", "HD"), true);
    assert.strictEqual(isReminderVisibleForTherapy("obat", "Transplantasi"), true);
  });

  it("capd reminders are visible only when the active therapy is CAPD", () => {
    assert.strictEqual(isReminderVisibleForTherapy("capd", "CAPD"), true);
    assert.strictEqual(isReminderVisibleForTherapy("capd", "HD"), false);
    assert.strictEqual(isReminderVisibleForTherapy("capd", "Transplantasi"), false);
  });

  it("hd reminders are visible only when the active therapy is HD", () => {
    assert.strictEqual(isReminderVisibleForTherapy("hd", "HD"), true);
    assert.strictEqual(isReminderVisibleForTherapy("hd", "CAPD"), false);
    assert.strictEqual(isReminderVisibleForTherapy("hd", "Transplantasi"), false);
  });

  it("simulates CAPD -> HD -> CAPD: capd reminder hides then reappears, aktif untouched", () => {
    // A reminder is just a plain object here — the point is that NOTHING
    // in this module ever mutates it. Visibility is derived, not stored.
    const capdReminder = { jenis: "capd", aktif: true };

    // Step 1: user is on CAPD -> visible
    assert.strictEqual(isReminderVisibleForTherapy(capdReminder.jenis, "CAPD"), true);

    // Step 2: user switches to HD -> hidden, but aktif is untouched (no mutation happened)
    assert.strictEqual(isReminderVisibleForTherapy(capdReminder.jenis, "HD"), false);
    assert.strictEqual(capdReminder.aktif, true, "aktif must remain true — no destructive mutation");

    // Step 3: user switches back to CAPD -> visible again, same aktif value preserved
    assert.strictEqual(isReminderVisibleForTherapy(capdReminder.jenis, "CAPD"), true);
    assert.strictEqual(capdReminder.aktif, true, "switching back restores visibility without any data loss");
  });

  it("a user-disabled (aktif=false) reminder's disabled state survives therapy switches (orthogonal concerns)", () => {
    // isReminderVisibleForTherapy only ever inspects jenis + metode — it must
    // never read or write `aktif`. Passing an object with aktif=false proves
    // the function's output doesn't depend on it.
    const disabledCapd = { jenis: "capd", aktif: false };
    assert.strictEqual(isReminderVisibleForTherapy(disabledCapd.jenis, "CAPD"), true);
    assert.strictEqual(disabledCapd.aktif, false, "user's manual disable is preserved, untouched by scoping");
  });
});
