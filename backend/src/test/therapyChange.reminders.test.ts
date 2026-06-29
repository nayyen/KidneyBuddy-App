/**
 * therapyChange.reminders.test.ts — Tests for REMIND-07: therapy change preserves
 * medication (obat) reminders and deactivates therapy-specific (capd/hd) reminders.
 *
 * Run: cd backend && node --import tsx --test src/test/therapyChange.reminders.test.ts
 *
 * Design: injects an in-memory fake deactivateTherapySpecific so the test is
 * purely about the logic, not the repository layer.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Import the deactivateTherapySpecific function from the reminderSchedule repository
// and the _changeTherapyWithReminderHookCore injectable from profile.service
const {
  _changeTherapyWithReminderHookCore,
} = await import("../services/profile.service.js");

// ─── In-memory fake for reminderSchedule ─────────────────────────────────────

type FakeReminder = {
  id: string;
  userId: string;
  jenis: string;  // 'obat' | 'capd' | 'hd'
  aktif: boolean;
};

function createFakeReminderRepo(initialReminders: FakeReminder[]) {
  const reminders = [...initialReminders];

  const deactivateTherapySpecific = async (userId: string, jenisToDeactivate: string): Promise<void> => {
    for (const r of reminders) {
      if (r.userId === userId && r.jenis === jenisToDeactivate) {
        r.aktif = false;
      }
    }
  };

  return { reminders, deactivateTherapySpecific };
}

// ─── REMIND-07 behavior tests ─────────────────────────────────────────────────

describe("REMIND-07 — therapy change reminder hook", () => {
  it("CAPD → HD: should deactivate capd reminders and preserve obat reminders", async () => {
    const repo = createFakeReminderRepo([
      { id: "r1", userId: "user-001", jenis: "obat", aktif: true },
      { id: "r2", userId: "user-001", jenis: "capd", aktif: true },
      { id: "r3", userId: "user-001", jenis: "capd", aktif: true },
    ]);

    await _changeTherapyWithReminderHookCore(
      "user-001",
      "CAPD",   // from (old method)
      "HD",     // to (new method)
      repo.deactivateTherapySpecific,
    );

    // obat reminder stays aktif
    const obat = repo.reminders.find((r) => r.id === "r1");
    assert.strictEqual(obat?.aktif, true, "obat reminder should remain aktif after therapy change");

    // capd reminders are deactivated
    const capd1 = repo.reminders.find((r) => r.id === "r2");
    const capd2 = repo.reminders.find((r) => r.id === "r3");
    assert.strictEqual(capd1?.aktif, false, "capd reminder r2 should be deactivated");
    assert.strictEqual(capd2?.aktif, false, "capd reminder r3 should be deactivated");
  });

  it("HD → CAPD: should deactivate hd reminders and preserve obat reminders", async () => {
    const repo = createFakeReminderRepo([
      { id: "r1", userId: "user-001", jenis: "obat", aktif: true },
      { id: "r2", userId: "user-001", jenis: "hd", aktif: true },
    ]);

    await _changeTherapyWithReminderHookCore(
      "user-001",
      "HD",      // from
      "CAPD",    // to
      repo.deactivateTherapySpecific,
    );

    const obat = repo.reminders.find((r) => r.id === "r1");
    assert.strictEqual(obat?.aktif, true, "obat reminder should stay aktif");

    const hd = repo.reminders.find((r) => r.id === "r2");
    assert.strictEqual(hd?.aktif, false, "hd reminder should be deactivated");
  });

  it("should not deactivate reminders for other users", async () => {
    const repo = createFakeReminderRepo([
      { id: "r1", userId: "user-001", jenis: "capd", aktif: true },
      { id: "r2", userId: "user-002", jenis: "capd", aktif: true }, // different user
    ]);

    await _changeTherapyWithReminderHookCore(
      "user-001",
      "CAPD",
      "HD",
      repo.deactivateTherapySpecific,
    );

    // user-001's capd is deactivated
    assert.strictEqual(repo.reminders.find((r) => r.id === "r1")?.aktif, false);
    // user-002's capd is NOT affected
    assert.strictEqual(repo.reminders.find((r) => r.id === "r2")?.aktif, true);
  });

  it("should not deactivate any reminders when switching to same method (no-op)", async () => {
    const repo = createFakeReminderRepo([
      { id: "r1", userId: "user-001", jenis: "capd", aktif: true },
    ]);

    // Same method change (no-op - hook should not be called, but if called it deactivates old)
    // When from === to, no deactivation needed
    await _changeTherapyWithReminderHookCore(
      "user-001",
      "CAPD",
      "CAPD",   // same method
      repo.deactivateTherapySpecific,
    );

    // capd reminder should stay aktif (no-op)
    assert.strictEqual(repo.reminders.find((r) => r.id === "r1")?.aktif, true);
  });
});
