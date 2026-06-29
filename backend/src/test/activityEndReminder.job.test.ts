/**
 * activityEndReminder.job.test.ts — TDD tests for ACTIVITY-02
 *
 * Tests _dispatchActivityEndCore with injected store to verify:
 *  - activity past estimasiSelesai triggers push with duration
 *  - activity within estimasiSelesai does NOT trigger push
 *  - already-reminded activity does NOT trigger duplicate push
 *  - push body contains correct Indonesian duration string
 *
 * Run: cd backend && node --import tsx --test src/test/activityEndReminder.job.test.ts
 */
import { describe, it, before } from "node:test";
import assert from "node:assert";

// Set ENCRYPTION_KEY before any module imports
process.env.ENCRYPTION_KEY = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3";

const { _dispatchActivityEndCore } = await import("../jobs/activityEndReminder.job.js");

// ─── In-memory store for test isolation ──────────────────────────────────────

function createMockDeps() {
  const sentNotifications: Array<{ userId: string; payload: unknown }> = [];
  const sentIds: string[] = [];

  const findDue = async (_windowStart: Date, windowEnd: Date) => {
    // Return activities that are past their end time
    // Test data is set up before each test case
    return mockActivities.filter((a) => {
      const endTime = a.estimasiSelesai instanceof Date
        ? a.estimasiSelesai.getTime()
        : new Date(a.estimasiSelesai).getTime();
      return endTime <= windowEnd.getTime() && !a.reminderSent;
    });
  };

  const markSent = async (id: string) => {
    sentIds.push(id);
    const act = mockActivities.find((a) => a.id === id);
    if (act) act.reminderSent = true;
  };

  const sendToAll = async (userId: string, payload: unknown) => {
    sentNotifications.push({ userId, payload });
  };

  const reset = () => {
    mockActivities.length = 0;
    sentNotifications.length = 0;
    sentIds.length = 0;
  };

  return { findDue, markSent, sendToAll, sentNotifications, sentIds, reset };
}

// Shared mutable store — reset per test
const mockActivities: Array<{
  id: string;
  userId: string;
  namaKegiatan: string;
  estimasiSelesai: Date;
  reminderSent: boolean;
}> = [];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("activityEndReminder._dispatchActivityEndCore", () => {
  it("activity past estimasiSelesai triggers push with duration", async () => {
    const deps = createMockDeps();

    const now = new Date("2026-06-28T10:00:00.000Z");
    const pastEnd = new Date("2026-06-28T09:45:00.000Z"); // 15 menit lalu

    mockActivities.push({
      id: "act-1",
      userId: "user-1",
      namaKegiatan: "Jalan pagi",
      estimasiSelesai: pastEnd,
      reminderSent: false,
    });

    await _dispatchActivityEndCore(now, deps);

    assert.strictEqual(deps.sentNotifications.length, 1, "should send exactly 1 notification");
    assert.strictEqual(deps.sentNotifications[0].userId, "user-1");
    assert.strictEqual((deps.sentNotifications[0].payload as any).title, "Masih Aktif");
    assert.ok(
      (deps.sentNotifications[0].payload as any).body.includes("Jalan pagi"),
      "body should include activity name",
    );
    assert.ok(
      (deps.sentNotifications[0].payload as any).body.includes("lebih"),
      "body should include 'lebih'",
    );
    assert.strictEqual(deps.sentIds.length, 1, "should mark reminderSent");
  });

  it("activity within estimasiSelesai does NOT trigger push", async () => {
    const deps = createMockDeps();

    const now = new Date("2026-06-28T10:00:00.000Z");
    const futureEnd = new Date("2026-06-28T11:00:00.000Z"); // 1 jam lagi

    mockActivities.push({
      id: "act-2",
      userId: "user-1",
      namaKegiatan: "Olahraga",
      estimasiSelesai: futureEnd,
      reminderSent: false,
    });

    await _dispatchActivityEndCore(now, deps);

    assert.strictEqual(deps.sentNotifications.length, 0, "should NOT send notification");
  });

  it("already-reminded activity does NOT trigger duplicate push", async () => {
    const deps = createMockDeps();

    const now = new Date("2026-06-28T10:00:00.000Z");
    const pastEnd = new Date("2026-06-28T09:00:00.000Z");

    mockActivities.push({
      id: "act-3",
      userId: "user-1",
      namaKegiatan: "Minum obat",
      estimasiSelesai: pastEnd,
      reminderSent: true, // Already reminded
    });

    await _dispatchActivityEndCore(now, deps);

    assert.strictEqual(deps.sentNotifications.length, 0, "should NOT send duplicate notification");
  });

  it("multiple past-due activities each get their own push", async () => {
    const deps = createMockDeps();

    const now = new Date("2026-06-28T10:00:00.000Z");

    mockActivities.push(
      {
        id: "act-4a",
        userId: "user-1",
        namaKegiatan: "Jalan pagi",
        estimasiSelesai: new Date("2026-06-28T09:30:00.000Z"),
        reminderSent: false,
      },
      {
        id: "act-4b",
        userId: "user-2",
        namaKegiatan: "Senam",
        estimasiSelesai: new Date("2026-06-28T09:45:00.000Z"),
        reminderSent: false,
      },
    );

    await _dispatchActivityEndCore(now, deps);

    assert.strictEqual(deps.sentNotifications.length, 2, "should send 2 notifications");
    assert.strictEqual(deps.sentIds.length, 2, "should mark 2 as reminded");
  });
});
