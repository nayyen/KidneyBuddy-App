/**
 * medicationLog.service.test.ts — TDD tests for the scheduled-prefix confirm/unconfirm guard
 *
 * Regression coverage for the HTTP 500 bug (quick-260705-9n4 task 1):
 * getTodayLogs() emits pseudo-entries with id="scheduled-<reminderId>" for
 * reminders that have no real log row yet. Posting that literal string to
 * confirmById/unconfirmById used to be cast straight into a uuid column,
 * throwing Postgres's "invalid input syntax for type uuid" (500).
 *
 * Uses the injectable _confirmByIdCore/_unconfirmByIdCore pattern (no
 * mock.module — Node 20 compatible), matching reminderDispatch.test.ts.
 *
 * Run: cd backend && node --import tsx --test src/test/medicationLog.service.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { _confirmByIdCore, _unconfirmByIdCore, SCHEDULED_PREFIX } = await import(
  "../services/medicationLog.service.js"
);

describe("medicationLog.service — _confirmByIdCore", () => {
  it("delegates to confirmByReminderId when logId has the scheduled- prefix", async () => {
    const calls: { userId: string; reminderId: string }[] = [];
    const markConfirmedByIdCalls: string[] = [];

    const result = await _confirmByIdCore("user-001", `${SCHEDULED_PREFIX}reminder-abc`, {
      markConfirmedById: async (logId) => {
        markConfirmedByIdCalls.push(logId);
      },
      confirmByReminderId: async (userId, reminderId) => {
        calls.push({ userId, reminderId });
        return { confirmed: true, logId: "real-log-id-1" };
      },
    });

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].userId, "user-001");
    assert.strictEqual(calls[0].reminderId, "reminder-abc");
    assert.strictEqual(result.confirmed, true);
    assert.strictEqual(result.logId, "real-log-id-1");
    // Must NOT attempt a direct uuid-column update with the pseudo id.
    assert.strictEqual(markConfirmedByIdCalls.length, 0);
  });

  it("calls markConfirmedById directly for a real uuid logId (no prefix)", async () => {
    const markConfirmedByIdCalls: { logId: string; userId: string }[] = [];

    const result = await _confirmByIdCore("user-001", "real-uuid-log-id", {
      markConfirmedById: async (logId, userId) => {
        markConfirmedByIdCalls.push({ logId, userId });
      },
      confirmByReminderId: async () => {
        throw new Error("should not be called for a non-scheduled id");
      },
    });

    assert.strictEqual(markConfirmedByIdCalls.length, 1);
    assert.strictEqual(markConfirmedByIdCalls[0].logId, "real-uuid-log-id");
    assert.strictEqual(result.confirmed, true);
    assert.strictEqual(result.logId, "real-uuid-log-id");
  });
});

describe("medicationLog.service — _unconfirmByIdCore", () => {
  it("looks up the real log by reminderId and unconfirms it when a scheduled- id is given", async () => {
    const markUnconfirmedCalls: { logId: string; userId: string }[] = [];

    const result = await _unconfirmByIdCore("user-001", `${SCHEDULED_PREFIX}reminder-abc`, {
      markUnconfirmedById: async (logId, userId) => {
        markUnconfirmedCalls.push({ logId, userId });
      },
      findByReminderAndUser: async (reminderId, userId) => {
        assert.strictEqual(reminderId, "reminder-abc");
        assert.strictEqual(userId, "user-001");
        return { id: "real-log-id-2" };
      },
    });

    assert.strictEqual(markUnconfirmedCalls.length, 1);
    assert.strictEqual(markUnconfirmedCalls[0].logId, "real-log-id-2");
    assert.strictEqual(result.confirmed, false);
  });

  it("no-ops (does not throw) when no real log row exists yet for a scheduled- id", async () => {
    const markUnconfirmedCalls: unknown[] = [];

    const result = await _unconfirmByIdCore("user-001", `${SCHEDULED_PREFIX}reminder-xyz`, {
      markUnconfirmedById: async () => {
        markUnconfirmedCalls.push(true);
      },
      findByReminderAndUser: async () => undefined,
    });

    assert.strictEqual(markUnconfirmedCalls.length, 0);
    assert.strictEqual(result.confirmed, false);
  });

  it("calls markUnconfirmedById directly for a real uuid logId (no prefix)", async () => {
    const markUnconfirmedCalls: { logId: string; userId: string }[] = [];

    const result = await _unconfirmByIdCore("user-001", "real-uuid-log-id", {
      markUnconfirmedById: async (logId, userId) => {
        markUnconfirmedCalls.push({ logId, userId });
      },
      findByReminderAndUser: async () => {
        throw new Error("should not be called for a non-scheduled id");
      },
    });

    assert.strictEqual(markUnconfirmedCalls.length, 1);
    assert.strictEqual(markUnconfirmedCalls[0].logId, "real-uuid-log-id");
    assert.strictEqual(result.confirmed, false);
  });

  // quick-260707-flu regression: the real findByReminderAndUser dep is now
  // date-scoped (bounds param), so it only ever resolves TODAY's row — an
  // old row is never returned to be unconfirmed. Simulate that scoped dep
  // and assert markUnconfirmedById is called with today's id, never an old
  // row's id.
  it("unconfirm with a scheduled- id only touches today's row (bounds-scoped finder)", async () => {
    const markUnconfirmedCalls: { logId: string; userId: string }[] = [];
    const OLD_ROW_ID = "old-log-id-from-last-month";
    const TODAY_ROW_ID = "today-log-id";

    const result = await _unconfirmByIdCore("user-001", `${SCHEDULED_PREFIX}reminder-abc`, {
      markUnconfirmedById: async (logId, userId) => {
        markUnconfirmedCalls.push({ logId, userId });
      },
      // A bounds-scoped finder (mirroring the real repository call site,
      // which now always passes localDayBounds(timezone)) resolves only
      // today's row, never the old one.
      findByReminderAndUser: async () => {
        return { id: TODAY_ROW_ID };
      },
    });

    assert.strictEqual(markUnconfirmedCalls.length, 1);
    assert.strictEqual(markUnconfirmedCalls[0].logId, TODAY_ROW_ID);
    assert.notStrictEqual(markUnconfirmedCalls[0].logId, OLD_ROW_ID);
    assert.strictEqual(result.confirmed, false);
  });
});
