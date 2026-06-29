/**
 * pushSubscription.test.ts — Unit tests for push_subscriptions schema and repository
 *
 * Run: cd backend && node --import tsx --test --test-name-pattern push_sub src/test/pushSubscription.test.ts
 *
 * Design note: Full DB integration tests (INSERT/SELECT/UPDATE round-trips)
 * require a running Postgres — those are performed via drizzle-kit push + manual UAT.
 * These unit tests verify:
 *  1. The schema's unique constraint is on `endpoint`, not `user_id`
 *  2. The upsert algorithm (in-memory simulation) — correct behaviour for two endpoints
 *     vs. same endpoint (mirrors what Postgres does on CONFLICT DO UPDATE)
 *  3. Repository module exports the expected functions
 *  4. findActiveByUser filter logic (in-memory simulation)
 *  5. deactivate sets aktif=false for exactly one row
 *
 * Consistent with auth.lockout.test.ts pattern: "Full integration requires Docker +
 * real Postgres. These unit tests verify the underlying primitives."
 */
import { describe, it } from "node:test";
import assert from "node:assert";

// ─── 1. Schema structure ──────────────────────────────────────────────────

describe("push_sub schema", () => {
  it("pushSubscriptions.schema exports the table with endpoint and userId", async () => {
    const { pushSubscriptions } = await import("../db/schema/pushSubscriptions.schema.js");
    // Table should have column definitions
    assert.ok(pushSubscriptions, "pushSubscriptions table exported");
    const cols = Object.keys(pushSubscriptions);
    assert.ok(cols.length > 0, "Table must have column definitions");
  });

  it("schema/index.ts barrel exports pushSubscriptions", async () => {
    const barrel = await import("../db/schema/index.js");
    assert.ok(
      "pushSubscriptions" in barrel,
      "barrel must export pushSubscriptions",
    );
  });

  it("unique constraint is on endpoint (not user_id)", async () => {
    const { pushSubscriptions } = await import("../db/schema/pushSubscriptions.schema.js");
    // Check that endpoint column definition has unique marker via drizzle internals
    // pushSubscriptions[Symbol.for("drizzle:Columns")] or direct column access
    const endpointCol = (pushSubscriptions as any).endpoint;
    assert.ok(endpointCol, "endpoint column exists on table");

    // Inspect the column config — drizzle sets isUnique on uniquely-constrained columns
    const config = endpointCol?.config ?? endpointCol?.columnType;
    // The column object should carry unique info — if the column was created with .unique()
    // it will have isUnique=true in its internals
    if (config) {
      assert.ok(
        config.isUnique === true || config.uniqueName != null,
        "endpoint must have .unique() constraint",
      );
    } else {
      // Alternative: check via table's unique index list
      const tableConfig = (pushSubscriptions as any)[Symbol.for("drizzle:Name")] ||
        (pushSubscriptions as any)._.name;
      // If we cannot introspect, verify the schema file text instead
      const { readFileSync } = await import("node:fs");
      const { fileURLToPath } = await import("node:url");
      const { dirname, resolve } = await import("node:path");
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const schemaPath = resolve(__dirname, "../db/schema/pushSubscriptions.schema.ts");
      const schemaText = readFileSync(schemaPath, "utf8");
      assert.ok(
        schemaText.includes('.unique()'),
        "pushSubscriptions.schema.ts must contain .unique() on endpoint column",
      );
      assert.ok(
        !schemaText.match(/userId.*\.unique\(\)|user_id.*unique/),
        "pushSubscriptions.schema.ts must NOT have .unique() on userId/user_id",
      );
    }
  });
});

// ─── 2. Repository module exports ─────────────────────────────────────────

describe("push_sub repository", () => {
  it("repository exports upsertByEndpoint, findActiveByUser, deactivate", async () => {
    const repo = await import("../repositories/pushSubscription.repository.js");
    assert.strictEqual(typeof repo.upsertByEndpoint, "function", "upsertByEndpoint must be a function");
    assert.strictEqual(typeof repo.findActiveByUser, "function", "findActiveByUser must be a function");
    assert.strictEqual(typeof repo.deactivate, "function", "deactivate must be a function");
    // Also check the named export alias
    assert.ok(repo.pushSubscriptionRepo, "pushSubscriptionRepo named export must exist");
  });
});

// ─── 3. Upsert algorithm (in-memory simulation) ────────────────────────────
//
// Simulates what Postgres CONFLICT DO UPDATE on endpoint produces.
// Two different endpoints → two rows.
// Same endpoint twice → one row (updated).

type MockSub = {
  id: string;
  userId: string;
  endpoint: string;
  subscriptionObject: Record<string, unknown>;
  aktif: boolean;
  lastConfirmedAt: Date;
};

function createInMemoryRepo() {
  const store: Map<string, MockSub> = new Map();
  let idCounter = 0;

  const upsertByEndpoint = (data: {
    userId: string;
    endpoint: string;
    subscriptionObject: Record<string, unknown>;
  }): MockSub => {
    const existing = store.get(data.endpoint);
    if (existing) {
      // Simulate ON CONFLICT DO UPDATE — update, do NOT insert new row
      const updated = {
        ...existing,
        subscriptionObject: data.subscriptionObject,
        aktif: true,
        lastConfirmedAt: new Date(),
      };
      store.set(data.endpoint, updated);
      return updated;
    }
    const row: MockSub = {
      id: String(++idCounter),
      userId: data.userId,
      endpoint: data.endpoint,
      subscriptionObject: data.subscriptionObject,
      aktif: true,
      lastConfirmedAt: new Date(),
    };
    store.set(data.endpoint, row);
    return row;
  };

  const findActiveByUser = (userId: string): MockSub[] =>
    [...store.values()].filter((r) => r.userId === userId && r.aktif === true);

  const deactivate = (id: string): void => {
    for (const [k, v] of store.entries()) {
      if (v.id === id) {
        store.set(k, { ...v, aktif: false });
        break;
      }
    }
  };

  return { upsertByEndpoint, findActiveByUser, deactivate };
}

describe("push_sub upsert algorithm", () => {
  const USER_A = "00000000-0000-0000-0000-000000000001";
  const SUB_OBJ = { endpoint: "", keys: { p256dh: "pk", auth: "auth" } };

  it("two different endpoints for same userId yield TWO rows", () => {
    const repo = createInMemoryRepo();
    repo.upsertByEndpoint({ userId: USER_A, endpoint: "https://push.example.com/sub/1", subscriptionObject: SUB_OBJ });
    repo.upsertByEndpoint({ userId: USER_A, endpoint: "https://push.example.com/sub/2", subscriptionObject: SUB_OBJ });
    const rows = repo.findActiveByUser(USER_A);
    assert.strictEqual(rows.length, 2, "Two different endpoints must produce two rows");
  });

  it("same endpoint upserted twice produces ONE row (no duplicate)", () => {
    const repo = createInMemoryRepo();
    const ENDPOINT = "https://push.example.com/sub/same";
    repo.upsertByEndpoint({ userId: USER_A, endpoint: ENDPOINT, subscriptionObject: SUB_OBJ });
    repo.upsertByEndpoint({ userId: USER_A, endpoint: ENDPOINT, subscriptionObject: { ...SUB_OBJ, updated: true } });
    const rows = repo.findActiveByUser(USER_A);
    assert.strictEqual(rows.length, 1, "Same endpoint upserted twice must yield only one row");
    // The second upsert should have updated the subscriptionObject
    assert.ok(
      (rows[0].subscriptionObject as any).updated === true,
      "Second upsert must update existing row\'s subscriptionObject",
    );
  });

  it("findActiveByUser returns only aktif=true rows for that userId", () => {
    const repo = createInMemoryRepo();
    const USER_B = "00000000-0000-0000-0000-000000000002";
    repo.upsertByEndpoint({ userId: USER_A, endpoint: "https://a.example/1", subscriptionObject: SUB_OBJ });
    repo.upsertByEndpoint({ userId: USER_A, endpoint: "https://a.example/2", subscriptionObject: SUB_OBJ });
    repo.upsertByEndpoint({ userId: USER_B, endpoint: "https://b.example/1", subscriptionObject: SUB_OBJ });

    const rowsA = repo.findActiveByUser(USER_A);
    assert.strictEqual(rowsA.length, 2, "findActiveByUser must return only rows for USER_A");

    // Deactivate one of USER_A\'s subs
    repo.deactivate(rowsA[0].id);
    const rowsAAfter = repo.findActiveByUser(USER_A);
    assert.strictEqual(rowsAAfter.length, 1, "After deactivate, findActiveByUser must exclude inactive row");
  });

  it("deactivate sets aktif=false for EXACTLY that row — other rows unaffected", () => {
    const repo = createInMemoryRepo();
    const r1 = repo.upsertByEndpoint({ userId: USER_A, endpoint: "https://x.example/1", subscriptionObject: SUB_OBJ });
    const r2 = repo.upsertByEndpoint({ userId: USER_A, endpoint: "https://x.example/2", subscriptionObject: SUB_OBJ });
    repo.deactivate(r1.id);
    const active = repo.findActiveByUser(USER_A);
    assert.strictEqual(active.length, 1, "Only one row should remain active");
    assert.strictEqual(active[0].id, r2.id, "The surviving row must be r2, not r1");
  });
});
