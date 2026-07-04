/**
 * communityPost.service.test.ts — TDD tests for community posts (COMMUNITY-01/03)
 *
 * Covers:
 *  - createPost: valid payload persists a row via an injected in-memory store
 *  - createPost: missing judul is rejected (Zod)
 *  - archivePost: owner archives (diarsipkan=true); a different user's attempt
 *    returns null (COMMUNITY-03 — IDOR-safe, not a 500 or a leaked row)
 *  - no code path issues a hard DELETE (structural source check)
 *
 * RED scaffold: communityPost.service.ts does not exist yet (built in 06-04).
 * This file fails at import until that plan lands — that is the intended
 * Wave 0 RED state (06-RESEARCH.md Test Map).
 *
 * Contract for 06-04 to implement against:
 *  - createPost(userId, rawPayload, deps?) — deps.insert(row) => Promise<Row>,
 *    defaults to the real repository when omitted.
 *  - archivePost(userId, id, deps?) — deps.archiveById(userId, id) => Promise<Row|null>,
 *    defaults to the real repository when omitted.
 *
 * Run: cd backend && node --import tsx --test src/test/communityPost.service.test.ts
 *
 * Pattern: follows labResult.service.test.ts's in-memory-store seam.
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const { createPostSchema, createPost, archivePost } = await import(
  "../services/communityPost.service.js"
);

const OWNER_ID = "00000000-0000-0000-0000-000000000001";
const OTHER_USER_ID = "00000000-0000-0000-0000-000000000002";

// ─── In-memory store ─────────────────────────────────────────────────────────

function createInMemoryPostStore() {
  const rows: Array<Record<string, unknown>> = [];

  const insert = async (data: Record<string, unknown>) => {
    const row = {
      // WR-01: archivePost/getPostDetail now format-validate id as a UUID
      // before hitting the repository, so the in-memory test double must
      // hand out real UUIDs too (a plain "test-post-N" string would be
      // rejected as malformed and short-circuit to null before ever
      // reaching store.archiveById).
      id: randomUUID(),
      userId: data.userId,
      judul: data.judul,
      isi: data.isi,
      kategori: data.kategori,
      metodeTerapi: data.metodeTerapi,
      diarsipkan: false,
      createdAt: new Date(),
    };
    rows.push(row);
    return row;
  };

  const archiveById = async (userId: string, id: string) => {
    const row = rows.find((r) => r.id === id && r.userId === userId);
    if (!row) return null;
    row.diarsipkan = true;
    return row;
  };

  return { rows, insert, archiveById };
}

// ─── Schema validation ────────────────────────────────────────────────────────

describe("community post schema validation", () => {
  it("valid payload passes schema", () => {
    const result = createPostSchema.safeParse({
      judul: "Bagaimana cara mengatasi kram saat CAPD?",
      isi: "Saya sering kram di malam hari, apa ada tips?",
      kategori: "pertanyaan",
      metodeTerapi: "CAPD",
    });
    assert.strictEqual(result.success, true);
  });

  it("missing judul is rejected", () => {
    const result = createPostSchema.safeParse({
      isi: "Saya sering kram di malam hari, apa ada tips?",
      kategori: "pertanyaan",
      metodeTerapi: "CAPD",
    });
    assert.strictEqual(result.success, false);
  });
});

// ─── createPost with injected store ──────────────────────────────────────────

describe("createPost", () => {
  it("valid payload persists a row via the injected in-memory insert", async () => {
    const store = createInMemoryPostStore();

    const result = await createPost(
      OWNER_ID,
      {
        judul: "Pengalaman transplantasi ginjal pertama saya",
        isi: "Ingin berbagi pengalaman setelah operasi bulan lalu.",
        kategori: "berbagi_pengalaman",
        metodeTerapi: "Transplantasi",
      },
      { insert: store.insert },
    );

    assert.strictEqual(store.rows.length, 1);
    assert.strictEqual(result.judul, "Pengalaman transplantasi ginjal pertama saya");
    assert.strictEqual(result.diarsipkan, false);
  });
});

// ─── archivePost — COMMUNITY-03 IDOR safety ──────────────────────────────────

describe("archivePost", () => {
  it("archives the post (diarsipkan=true) for the owner", async () => {
    const store = createInMemoryPostStore();
    const created = await store.insert({
      userId: OWNER_ID,
      judul: "Judul",
      isi: "Isi",
      kategori: "informasi",
      metodeTerapi: "HD",
    });

    const result = await archivePost(OWNER_ID, created.id as string, {
      archiveById: store.archiveById,
    });

    assert.notStrictEqual(result, null);
    assert.strictEqual(result?.diarsipkan, true);
  });

  it("returns null for a different user's post id (IDOR-safe)", async () => {
    const store = createInMemoryPostStore();
    const created = await store.insert({
      userId: OWNER_ID,
      judul: "Judul",
      isi: "Isi",
      kategori: "informasi",
      metodeTerapi: "HD",
    });

    const result = await archivePost(OTHER_USER_ID, created.id as string, {
      archiveById: store.archiveById,
    });

    assert.strictEqual(result, null);
    // The row must remain un-archived — the attempt must not have side effects.
    assert.strictEqual(store.rows[0]?.diarsipkan, false);
  });
});

// ─── COMMUNITY-03 — never hard-deleted ────────────────────────────────────────

describe("no hard delete", () => {
  it("communityPost.service.ts contains no DELETE statement", () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const servicePath = join(__dirname, "../services/communityPost.service.ts");
    const source = readFileSync(servicePath, "utf-8");
    assert.doesNotMatch(source, /\.delete\(/);
    assert.doesNotMatch(source, /DELETE FROM/i);
  });
});
