/**
 * activity.service.test.ts — TDD tests for daily activity logging (ACTIVITY-01, ACTIVITY-03)
 *
 * Covers:
 *  - createActivity: valid payload returns berlangsung status
 *  - createActivity: past estimasiSelesai is rejected
 *  - createActivity: empty namaKegiatan is rejected
 *  - completeActivity: feelings rating persisted with encrypted catatan
 *  - completeActivity: skipped feelings works (perasaan=null, catatan=null)
 *
 * Run: cd backend && node --import tsx --test src/test/activity.service.test.ts
 *
 * Design: follows fluid.service.test.ts pattern — the service exports core
 * functions (_createActivityCore, _completeActivityCore) with injectable
 * dependencies so tests run without a live Postgres connection.
 *
 * Updated quick-260705-9n4 task 8 (B5): the create-activity contract changed
 * from estimasiMenit (duration in minutes) to estimasiSelesaiJam (wall-clock
 * HH:mm finish time) — see MulaiKegiatanForm.tsx / activities.service.ts.
 */
import { describe, it } from "node:test";
import assert from "node:assert";

// Set ENCRYPTION_KEY before module imports (validated at load time)
const TEST_KEY = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3";
process.env.ENCRYPTION_KEY = TEST_KEY;

// Import real encrypt/decrypt for the encryption round-trip test
const { encrypt, decrypt } = await import("../lib/encryption.js");

// Import the service core exports — will fail until Task 3 creates the service
const {
  createActivitySchema,
  _createActivityCore,
  _completeActivityCore,
} = await import("../services/activities.service.js");

// ─── In-memory store for test isolation ──────────────────────────────────────

type StoredActivity = {
  id: string;
  userId: string;
  namaKegiatan: string;
  waktuMulai: Date;
  estimasiSelesai: Date;
  status: string;
  waktuSelesai: Date | null;
  perasaan: string | null;
  catatanPerasaan: string | null; // stored ciphertext
  reminderSent: boolean;
  createdAt: Date;
};

function createInMemoryActivityStore() {
  const rows: StoredActivity[] = [];
  let counter = 0;

  const insertActivity = async (data: {
    userId: string;
    namaKegiatan: string;
    waktuMulai: Date;
    estimasiSelesai: Date;
    status: string;
    reminderSent: boolean;
    createdAt: Date;
  }): Promise<StoredActivity> => {
    const row: StoredActivity = {
      id: `test-id-${++counter}`,
      userId: data.userId,
      namaKegiatan: data.namaKegiatan,
      waktuMulai: data.waktuMulai,
      estimasiSelesai: data.estimasiSelesai,
      status: data.status,
      waktuSelesai: null,
      perasaan: null,
      catatanPerasaan: null,
      reminderSent: false,
      createdAt: data.createdAt,
    };
    rows.push(row);
    return row;
  };

  const completeById = async (
    userId: string,
    id: string,
    data: {
      status: string;
      waktuSelesai: Date;
      perasaan: string | null;
      catatanPerasaan: string | null;
    },
  ): Promise<StoredActivity> => {
    const idx = rows.findIndex((r) => r.id === id && r.userId === userId);
    if (idx === -1) throw new Error("Activity not found");
    rows[idx] = { ...rows[idx], ...data };
    return rows[idx];
  };

  return { rows, insertActivity, completeById };
}

const USER_ID = "00000000-0000-0000-0000-000000000001";

// ─── Schema validation (pure zod) ────────────────────────────────────────────
//
// B5 (quick-260705-9n4 task 8): estimasiMenit (duration in minutes) was
// replaced by estimasiSelesaiJam (wall-clock HH:mm finish time), matching
// jamPengingat's convention used elsewhere (reminders). This fixture was
// updated to match — the old estimasiMenit contract no longer exists.

describe("activity schema validation", () => {
  it("empty namaKegiatan is rejected", () => {
    const result = createActivitySchema.safeParse({
      namaKegiatan: "",
      estimasiSelesaiJam: "17:00",
    });
    assert.strictEqual(result.success, false);
  });

  it("malformed estimasiSelesaiJam (not HH:mm) is rejected", () => {
    const result = createActivitySchema.safeParse({
      namaKegiatan: "Jalan pagi",
      estimasiSelesaiJam: "5pm",
    });
    assert.strictEqual(result.success, false);
  });

  it("missing estimasiSelesaiJam is rejected", () => {
    const result = createActivitySchema.safeParse({ namaKegiatan: "Jalan pagi" });
    assert.strictEqual(result.success, false);
  });

  it("valid payload passes schema", () => {
    const result = createActivitySchema.safeParse({
      namaKegiatan: "Jalan pagi",
      estimasiSelesaiJam: "17:00",
    });
    assert.strictEqual(result.success, true);
  });
});

// ─── _createActivityCore with injected store ─────────────────────────────────
//
// Fixed reference "now" (2026-07-05T10:00:00Z == 17:00 Asia/Jakarta) so
// future-vs-past assertions are deterministic regardless of when the test
// runner executes.
const FIXED_NOW = new Date("2026-07-05T10:00:00.000Z");

describe("activity _createActivityCore", () => {
  it("createActivity with a future estimasiSelesaiJam returns berlangsung status and future estimasiSelesai", async () => {
    const store = createInMemoryActivityStore();

    const result = await _createActivityCore(
      USER_ID,
      { namaKegiatan: "Jalan pagi", estimasiSelesaiJam: "18:00" }, // 18:00 Jakarta > 17:00 "now"
      store.insertActivity,
      { waktuMulai: FIXED_NOW, timezone: "Asia/Jakarta" },
    );

    assert.ok(result, "Must return an activity object");
    assert.strictEqual(result.status, "berlangsung");
    assert.ok(result.estimasiSelesai instanceof Date, "estimasiSelesai must be a Date");
    assert.ok(
      result.estimasiSelesai.getTime() > FIXED_NOW.getTime(),
      "estimasiSelesai must be in the future relative to waktuMulai",
    );
    // 18:00 Jakarta (UTC+7) == 11:00 UTC
    assert.strictEqual(result.estimasiSelesai.toISOString(), "2026-07-05T11:00:00.000Z");
    assert.strictEqual(result.namaKegiatan, "Jalan pagi");
  });

  it("a past estimasiSelesaiJam (relative to waktuMulai) is rejected before insert", async () => {
    const store = createInMemoryActivityStore();

    await assert.rejects(() =>
      _createActivityCore(
        USER_ID,
        { namaKegiatan: "Jalan pagi", estimasiSelesaiJam: "08:00" }, // 08:00 Jakarta < 17:00 "now"
        store.insertActivity,
        { waktuMulai: FIXED_NOW, timezone: "Asia/Jakarta" },
      ),
    );
  });
});

// ─── _completeActivityCore with injected store ────────────────────────────────

describe("activity _completeActivityCore", () => {
  it("completeActivity with perasaan and catatan → status selesai, perasaan stored, catatan encrypted", async () => {
    const store = createInMemoryActivityStore();

    // First create an activity
    const activity = await store.insertActivity({
      userId: USER_ID,
      namaKegiatan: "Jalan pagi",
      waktuMulai: new Date(),
      estimasiSelesai: new Date(Date.now() + 3600000),
      status: "berlangsung",
      reminderSent: false,
      createdAt: new Date(),
    });

    const originalCatatan = "capek sekali";
    const result = await _completeActivityCore(
      USER_ID,
      activity.id,
      { perasaan: "lelah", catatan: originalCatatan },
      store.completeById,
      encrypt,
    );

    assert.strictEqual(result.status, "selesai", "Status should be selesai");
    assert.strictEqual(result.perasaan, "lelah", "Perasaan should be lelah");
    assert.ok(result.waktuSelesai instanceof Date, "waktuSelesai must be set");

    // catatanPerasaan should be ciphertext (not equal to the original plaintext)
    assert.notStrictEqual(result.catatanPerasaan, originalCatatan, "catatanPerasaan must be encrypted");
    // Should be decryptable back to the original
    if (result.catatanPerasaan) {
      const decrypted = decrypt(result.catatanPerasaan);
      assert.strictEqual(decrypted, originalCatatan, "Decrypted catatan should match original");
    }
  });

  it("completeActivity with skipped feelings (perasaan=null, catatan=null) → status selesai", async () => {
    const store = createInMemoryActivityStore();

    const activity = await store.insertActivity({
      userId: USER_ID,
      namaKegiatan: "Jalan pagi",
      waktuMulai: new Date(),
      estimasiSelesai: new Date(Date.now() + 3600000),
      status: "berlangsung",
      reminderSent: false,
      createdAt: new Date(),
    });

    const result = await _completeActivityCore(
      USER_ID,
      activity.id,
      { perasaan: null, catatan: null },
      store.completeById,
      encrypt,
    );

    assert.strictEqual(result.status, "selesai", "Status should be selesai");
    assert.strictEqual(result.perasaan, null, "perasaan should be null");
    assert.strictEqual(result.catatanPerasaan, null, "catatanPerasaan should be null");
  });
});
