/**
 * reminderDispatch.test.ts — unit tests for _dispatchCore (REMIND-02)
 * Uses injectable pattern (no mock.module — Node 20 compatible).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { _dispatchCore, type DispatchDeps } from "../jobs/reminderDispatch.job.js";

const BASE_REMINDER = {
  id: "rem-1",
  userId: "user-1",
  nama: "Amlodipine",
  dosis: "5mg",
  jenisObat: "minum",
  jenis: "obat",
  aktif: true,
  jamPengingat: "08:00",
  hariAktif: ["Senin"],
  catatanWaktu: null,
  fotoObat: null,
  konsentrasiCapd: null,
  followUpSent: false,
  lastNotificationSentAt: null,
  createdAt: new Date(),
};

function makeDeps(overrides: Partial<DispatchDeps> = {}): DispatchDeps & {
  insertedLogs: unknown[];
  sentNotifications: { userId: string; payload: unknown }[];
  dispatched: string[];
} {
  const insertedLogs: unknown[] = [];
  const sentNotifications: { userId: string; payload: unknown }[] = [];
  const dispatched: string[] = [];
  return {
    findDue: async () => [],
    insertLog: async (data) => { insertedLogs.push(data); return data; },
    sendToAll: async (userId, payload) => { sentNotifications.push({ userId, payload }); },
    markDispatched: async (id) => { dispatched.push(id); },
    insertedLogs,
    sentNotifications,
    dispatched,
    ...overrides,
  };
}

describe("dispatchDueReminders", () => {
  it("does nothing when no reminders are due", async () => {
    const deps = makeDeps({ findDue: async () => [] });
    await _dispatchCore("08:00", "Senin", deps);
    assert.strictEqual(deps.insertedLogs.length, 0);
    assert.strictEqual(deps.sentNotifications.length, 0);
  });

  it("inserts a tertunda log row for each due reminder", async () => {
    const deps = makeDeps({ findDue: async () => [BASE_REMINDER as any] });
    await _dispatchCore("08:00", "Senin", deps);
    assert.strictEqual(deps.insertedLogs.length, 1);
    const log = deps.insertedLogs[0] as any;
    assert.strictEqual(log.userId, "user-1");
    assert.strictEqual(log.reminderId, "rem-1");
    assert.strictEqual(log.status, "tertunda");
    assert.strictEqual(log.namaObat, "Amlodipine");
  });

  it("calls sendToAll with correct title and reminderId", async () => {
    const deps = makeDeps({ findDue: async () => [BASE_REMINDER as any] });
    await _dispatchCore("08:00", "Senin", deps);
    assert.strictEqual(deps.sentNotifications.length, 1);
    const { userId, payload } = deps.sentNotifications[0];
    assert.strictEqual(userId, "user-1");
    const p = payload as any;
    assert.match(p.title, /Amlodipine/);
    assert.strictEqual(p.reminderId, "rem-1");
  });

  it("marks lastNotificationSentAt after dispatch (dedup guard)", async () => {
    const deps = makeDeps({ findDue: async () => [BASE_REMINDER as any] });
    await _dispatchCore("08:00", "Senin", deps);
    assert.strictEqual(deps.dispatched.length, 1);
    assert.strictEqual(deps.dispatched[0], "rem-1");
  });

  it("dedup guard: repository returns zero rows when already dispatched this minute", async () => {
    const deps = makeDeps({ findDue: async () => [] });
    await _dispatchCore("08:00", "Senin", deps);
    assert.strictEqual(deps.sentNotifications.length, 0);
  });

  it("continues processing other reminders if one send fails", async () => {
    const rem2 = { ...BASE_REMINDER, id: "rem-2" };
    let callCount = 0;
    const deps = makeDeps({
      findDue: async () => [BASE_REMINDER, rem2] as any[],
      sendToAll: async () => { if (callCount++ === 0) throw new Error("push failed"); },
    });
    await assert.doesNotReject(_dispatchCore("08:00", "Senin", deps));
    // Both inserts attempted despite first send failing
    assert.strictEqual(deps.insertedLogs.length, 2);
  });
});
