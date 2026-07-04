/**
 * communityReply.service.test.ts — TDD tests for community replies (COMMUNITY-02)
 *
 * Covers:
 *  - createReply: empty isi is rejected (Zod)
 *  - createReply: valid payload persists a row via an injected in-memory store
 *  - toggleHelpful: round-trips { marked: true } then { marked: false } for the
 *    same (userId, replyId) pair — proving the toggle semantics through an
 *    injected in-memory join store (D-08/D-09)
 *
 * RED scaffold: communityReply.service.ts does not exist yet (built in 06-05).
 * This file fails at import until that plan lands — that is the intended
 * Wave 0 RED state (06-RESEARCH.md Test Map).
 *
 * Contract for 06-05 to implement against:
 *  - createReply(userId, postId, rawPayload, deps?) — deps.insert(row) => Promise<Row>,
 *    defaults to the real repository when omitted.
 *  - toggleHelpful(userId, replyId, deps?) — deps.toggle(userId, replyId) => Promise<{marked:boolean}>,
 *    defaults to the real repository when omitted. No userId-ownership guard (D-08).
 *
 * Run: cd backend && node --import tsx --test src/test/communityReply.service.test.ts
 *
 * Pattern: follows labResult.service.test.ts's in-memory-store seam.
 */
import { describe, it } from "node:test";
import assert from "node:assert";

const { createReplySchema, createReply, toggleHelpful } = await import(
  "../services/communityReply.service.js"
);

const USER_ID = "00000000-0000-0000-0000-000000000001";
const POST_ID = "00000000-0000-0000-0000-000000000099";
const REPLY_ID = "00000000-0000-0000-0000-000000000042";

// ─── In-memory stores ─────────────────────────────────────────────────────────

function createInMemoryReplyStore() {
  const rows: Array<Record<string, unknown>> = [];
  let counter = 0;

  const insert = async (data: Record<string, unknown>) => {
    const row = {
      id: `test-reply-${++counter}`,
      postId: data.postId,
      userId: data.userId,
      isi: data.isi,
      createdAt: new Date(),
    };
    rows.push(row);
    return row;
  };

  return { rows, insert };
}

function createInMemoryHelpfulStore() {
  // Set of "userId:replyId" pairs — mirrors the unique(reply_id,user_id) constraint (D-09)
  const marks = new Set<string>();

  const toggle = async (userId: string, replyId: string) => {
    const key = `${userId}:${replyId}`;
    if (marks.has(key)) {
      marks.delete(key);
      return { marked: false };
    }
    marks.add(key);
    return { marked: true };
  };

  return { marks, toggle };
}

// ─── Schema validation ────────────────────────────────────────────────────────

describe("community reply schema validation", () => {
  it("valid payload passes schema", () => {
    const result = createReplySchema.safeParse({ isi: "Coba kompres hangat sebelum tidur." });
    assert.strictEqual(result.success, true);
  });

  it("empty isi is rejected", () => {
    const result = createReplySchema.safeParse({ isi: "" });
    assert.strictEqual(result.success, false);
  });
});

// ─── createReply with injected store ─────────────────────────────────────────

describe("createReply", () => {
  it("valid payload persists a row via the injected in-memory insert", async () => {
    const store = createInMemoryReplyStore();

    const result = await createReply(
      USER_ID,
      POST_ID,
      { isi: "Coba kompres hangat sebelum tidur." },
      { insert: store.insert },
    );

    assert.strictEqual(store.rows.length, 1);
    assert.strictEqual(result.isi, "Coba kompres hangat sebelum tidur.");
    assert.strictEqual(result.postId, POST_ID);
  });
});

// ─── toggleHelpful — COMMUNITY-02 round trip ─────────────────────────────────

describe("toggleHelpful", () => {
  it("returns marked:true on first call, marked:false on second call for the same pair", async () => {
    const store = createInMemoryHelpfulStore();

    const first = await toggleHelpful(USER_ID, REPLY_ID, { toggle: store.toggle });
    assert.strictEqual(first.marked, true);

    const second = await toggleHelpful(USER_ID, REPLY_ID, { toggle: store.toggle });
    assert.strictEqual(second.marked, false);
  });
});
