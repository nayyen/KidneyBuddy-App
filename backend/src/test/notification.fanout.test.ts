/**
 * notification.fanout.test.ts — Unit tests for push notification fan-out
 *
 * Run: cd backend && node --import tsx --test --test-name-pattern "fan" src/test/notification.fanout.test.ts
 *
 * Design: Tests the exported `fanOut()` function directly with injected
 * mock implementations of the send and deactivate functions.
 * This approach avoids ESM module mocking complexity (which requires Node >=22)
 * and directly tests the fan-out algorithm\'s contract.
 *
 * Consistent with existing test pattern: unit tests verify algorithm logic;
 * integration with real web-push requires a live browser subscription.
 */
import { describe, it } from "node:test";
import assert from "node:assert";

// Set ENCRYPTION_KEY for transitive imports that load encryption.ts
process.env.ENCRYPTION_KEY = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

const { fanOut } = await import("../services/notification.service.js");
import type { PushSubscription } from "../repositories/pushSubscription.repository.js";

// Helper: create a minimal PushSubscription mock row
function makeSub(id: string): PushSubscription {
  return {
    id,
    userId: "user-001",
    endpoint: `https://push.example.com/${id}`,
    subscriptionObject: {
      endpoint: `https://push.example.com/${id}`,
      keys: { p256dh: "pk", auth: "auth" },
    } as any,
    deviceLabel: null,
    aktif: true,
    lastConfirmedAt: new Date(),
    createdAt: new Date(),
  };
}

describe("notification fan-out", () => {
  it("fanOut calls send exactly N times for N active subscriptions", async () => {
    const subs = [makeSub("a"), makeSub("b"), makeSub("c")];
    let sendCallCount = 0;
    const mockSend = async (_sub: PushSubscription) => {
      sendCallCount++;
    };
    const mockDeactivate = async (_id: string) => {};

    await fanOut(subs, mockSend, mockDeactivate);
    assert.strictEqual(sendCallCount, 3, "send must be called once per subscription");
  });

  it("fanOut deactivates ONLY the 410-Gone row — other rows receive send", async () => {
    const sub1 = makeSub("sub-1");
    const sub2 = makeSub("sub-2-gone"); // this one will return 410
    const sub3 = makeSub("sub-3");
    const subs = [sub1, sub2, sub3];

    let sendCallCount = 0;
    const deactivatedIds: string[] = [];

    const mockSend = async (sub: PushSubscription) => {
      sendCallCount++;
      if (sub.id === "sub-2-gone") {
        // Simulate HTTP 410 Gone response from push service
        const err = Object.assign(new Error("Push subscription has unsubscribed or expired."), {
          statusCode: 410,
        });
        throw err;
      }
    };

    const mockDeactivate = async (id: string) => {
      deactivatedIds.push(id);
    };

    await fanOut(subs, mockSend, mockDeactivate);

    assert.strictEqual(sendCallCount, 3, "send must be called for ALL 3 subscriptions");
    assert.strictEqual(deactivatedIds.length, 1, "ONLY the 410 row must be deactivated");
    assert.strictEqual(deactivatedIds[0], "sub-2-gone", "deactivated id must be the 410 row");
  });

  it("non-410 rejection is logged but does NOT throw and does NOT deactivate", async () => {
    const subs = [makeSub("ok-1"), makeSub("err-1"), makeSub("ok-2")];
    let sendCallCount = 0;
    const deactivatedIds: string[] = [];

    const mockSend = async (sub: PushSubscription) => {
      sendCallCount++;
      if (sub.id === "err-1") {
        const err = Object.assign(new Error("Internal Server Error"), { statusCode: 500 });
        throw err;
      }
    };

    const mockDeactivate = async (id: string) => {
      deactivatedIds.push(id);
    };

    // Should not throw even though one send failed
    await assert.doesNotReject(
      () => fanOut(subs, mockSend, mockDeactivate),
      "fanOut must not throw on non-410 errors",
    );

    assert.strictEqual(sendCallCount, 3, "send attempted for all 3 subs");
    assert.strictEqual(deactivatedIds.length, 0, "non-410 error must NOT trigger deactivate");
  });

  it("fanOut with 0 subscriptions does nothing and does not throw", async () => {
    let sendCallCount = 0;
    const mockSend = async (_sub: PushSubscription) => { sendCallCount++; };
    const mockDeactivate = async (_id: string) => {};

    await assert.doesNotReject(() => fanOut([], mockSend, mockDeactivate));
    assert.strictEqual(sendCallCount, 0, "no sends when subs array is empty");
  });

  it("multiple 410 rows each trigger their own deactivate independently", async () => {
    const subs = [makeSub("gone-1"), makeSub("alive"), makeSub("gone-2")];
    const deactivatedIds: string[] = [];

    const mockSend = async (sub: PushSubscription) => {
      if (sub.id.startsWith("gone")) {
        const err = Object.assign(new Error("Gone"), { statusCode: 410 });
        throw err;
      }
    };
    const mockDeactivate = async (id: string) => { deactivatedIds.push(id); };

    await fanOut(subs, mockSend, mockDeactivate);
    assert.strictEqual(deactivatedIds.length, 2, "both gone-1 and gone-2 must be deactivated");
    assert.ok(deactivatedIds.includes("gone-1"), "gone-1 deactivated");
    assert.ok(deactivatedIds.includes("gone-2"), "gone-2 deactivated");
  });
});
