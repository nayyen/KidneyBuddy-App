/**
 * fluid.service.test.ts — TDD tests for fluid tracking vertical slice
 *
 * Covers:
 *  - fluidLog: createEntry persists entry with correct fields, returns hasAbnormalCondition
 *  - balance: getDailyBalance returns correct masuk/keluar/delta
 *  - capd_condition: CAPD condition check keruh/berdarah → hasAbnormalCondition=true
 *  - Encryption: catatan stored as ciphertext, decrypted on read
 *  - Validation: volume <= 0 rejected with clear message
 *  - Late entry: isLateEntry persists as true
 *
 * Run: cd backend && node --import tsx --test src/test/fluid.service.test.ts
 *
 * Design: follows notification.service.ts pattern — the service exports a core
 * function (_createEntryCore, _getDailyBalanceCore) with injectable dependencies
 * so tests run without a live Postgres connection.
 * Pure helpers (computeHasAbnormalCondition, createFluidSchema) are tested directly.
 */
import { describe, it } from "node:test";
import assert from "node:assert";

// Set ENCRYPTION_KEY before module imports (validated at load time)
const TEST_KEY = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
process.env.ENCRYPTION_KEY = TEST_KEY;

// Import real encrypt/decrypt for the encryption round-trip test
const { encrypt, decrypt } = await import("../lib/encryption.js");

// Import the service core exports
const {
  createFluidSchema,
  computeHasAbnormalCondition,
  _createEntryCore,
  _getDailyBalanceCore,
} = await import("../services/fluid.service.js");

// ─── In-memory store for test isolation ──────────────────────────────────────

type StoredEntry = {
  id: string;
  userId: string;
  tanggal: string;
  waktu: string;
  tipe: string;
  sumber: string | null;
  konsentrasiCapd: string | null;
  volume: number;
  satuan: string;
  kondisiKeluar: string | null;
  catatan: string | null; // stored ciphertext
  isLateEntry: boolean;
  createdAt: Date;
};

function createInMemoryFluidStore() {
  const rows: StoredEntry[] = [];
  let counter = 0;

  const insertEntry = async (data: Omit<StoredEntry, "id" | "createdAt">): Promise<StoredEntry> => {
    const row: StoredEntry = {
      ...data,
      id: `test-id-${++counter}`,
      createdAt: new Date(),
    };
    rows.push(row);
    return row;
  };

  const ABNORMAL = new Set(["keruh", "keruh_gumpalan", "berdarah"]);
  const getDailyBalance = async (userId: string, date: string) => {
    const filtered = rows.filter((r) => r.userId === userId && r.tanggal === date);
    const masuk = filtered
      .filter((r) => r.tipe === "masuk")
      .reduce((sum, r) => sum + r.volume, 0);
    const keluar = filtered
      .filter((r) => r.tipe === "keluar")
      .reduce((sum, r) => sum + r.volume, 0);
    const hasAbnormalCondition = filtered.some(
      (r) => r.kondisiKeluar && ABNORMAL.has(r.kondisiKeluar),
    );
    return { masuk, keluar, delta: masuk - keluar, unit: "ml" as const, hasAbnormalCondition };
  };

  return { rows, insertEntry, getDailyBalance };
}

const TODAY = new Date().toISOString().slice(0, 10);
const USER_ID = "00000000-0000-0000-0000-000000000001";

// ─── Schema validation (pure zod) ────────────────────────────────────────────

describe("fluidLog schema validation", () => {
  it("volume <= 0 is rejected with a clear message about volume being positive", () => {
    const result = createFluidSchema.safeParse({ tipe: "masuk", sumber: "lainnya", volume: 0, satuan: "ml" });
    assert.strictEqual(result.success, false);
    const msg = result.error?.issues[0]?.message?.toLowerCase() ?? "";
    assert.ok(
      msg.includes("positif") || msg.includes("positive") || msg.includes("greater than") || msg.includes("lebih dari"),
      `Expected message about positive volume, got: "${msg}"`
    );
  });

  it("negative volume is rejected", () => {
    const result = createFluidSchema.safeParse({ tipe: "masuk", sumber: "lainnya", volume: -100, satuan: "ml" });
    assert.strictEqual(result.success, false);
  });

  it("invalid tipe enum is rejected", () => {
    const result = createFluidSchema.safeParse({ tipe: "naik", sumber: "lainnya", volume: 100, satuan: "ml" });
    assert.strictEqual(result.success, false);
  });

  it("invalid kondisiKeluar enum is rejected", () => {
    const result = createFluidSchema.safeParse({
      tipe: "keluar",
      sumber: "lainnya",
      volume: 500,
      satuan: "ml",
      kondisiKeluar: "merah_darah",
    });
    assert.strictEqual(result.success, false);
  });

  // F1 (quick-260705-9n4 task 11): sumber is now REQUIRED — a payload
  // missing it entirely must be rejected.
  it("missing sumber is rejected", () => {
    const result = createFluidSchema.safeParse({ tipe: "masuk", volume: 250, satuan: "ml" });
    assert.strictEqual(result.success, false);
  });

  it("valid masuk entry passes schema", () => {
    const result = createFluidSchema.safeParse({ tipe: "masuk", sumber: "makanan", volume: 250, satuan: "ml" });
    assert.strictEqual(result.success, true);
  });

  it("valid keluar entry with CAPD condition passes schema", () => {
    const result = createFluidSchema.safeParse({
      tipe: "keluar",
      sumber: "capd",
      volume: 800,
      satuan: "ml",
      kondisiKeluar: "keruh",
      konsentrasiCapd: "2.5%",
    });
    assert.strictEqual(result.success, true);
  });

  // F2 (quick-260705-9n4 task 11): cross-field validation — Urine only
  // valid for Cairan Keluar; Makanan/Minuman only valid for Cairan Masuk.
  it("sumber=urine on tipe=masuk is rejected (Urine is keluar-only)", () => {
    const result = createFluidSchema.safeParse({ tipe: "masuk", sumber: "urine", volume: 250, satuan: "ml" });
    assert.strictEqual(result.success, false);
  });

  it("sumber=makanan on tipe=keluar is rejected (Makanan is masuk-only)", () => {
    const result = createFluidSchema.safeParse({ tipe: "keluar", sumber: "makanan", volume: 250, satuan: "ml" });
    assert.strictEqual(result.success, false);
  });

  it("sumber=capd without konsentrasiCapd is rejected", () => {
    const result = createFluidSchema.safeParse({ tipe: "masuk", sumber: "capd", volume: 250, satuan: "ml" });
    assert.strictEqual(result.success, false);
  });

  it("sumber=capd WITH konsentrasiCapd passes schema", () => {
    const result = createFluidSchema.safeParse({
      tipe: "masuk",
      sumber: "capd",
      konsentrasiCapd: "1.5%",
      volume: 250,
      satuan: "ml",
    });
    assert.strictEqual(result.success, true);
  });
});

// ─── capd_condition: pure computeHasAbnormalCondition ───────────────────────

describe("capd_condition computeHasAbnormalCondition", () => {
  it("keruh → true", () => {
    assert.strictEqual(computeHasAbnormalCondition("keruh"), true);
  });

  it("keruh_gumpalan → true", () => {
    assert.strictEqual(computeHasAbnormalCondition("keruh_gumpalan"), true);
  });

  it("berdarah → true", () => {
    assert.strictEqual(computeHasAbnormalCondition("berdarah"), true);
  });

  it("jernih → false", () => {
    assert.strictEqual(computeHasAbnormalCondition("jernih"), false);
  });

  it("null (masuk entry, no condition) → false", () => {
    assert.strictEqual(computeHasAbnormalCondition(null), false);
  });

  it("undefined → false", () => {
    assert.strictEqual(computeHasAbnormalCondition(undefined), false);
  });
});

// ─── fluidLog: _createEntryCore with injected store ─────────────────────────

describe("fluidLog _createEntryCore", () => {
  it("returns entry with correct tipe, volume, tanggal, satuan", async () => {
    const store = createInMemoryFluidStore();
    const result = await _createEntryCore(
      USER_ID,
      { tipe: "masuk", sumber: "lainnya", volume: 250, satuan: "ml", tanggal: TODAY, waktu: "08:00" },
      store.insertEntry,
      encrypt,
      decrypt
    );
    assert.ok(result.entry, "Must return an entry object");
    assert.strictEqual(result.entry.tipe, "masuk");
    assert.strictEqual(result.entry.volume, 250);
    assert.strictEqual(result.entry.tanggal, TODAY);
    assert.strictEqual(result.entry.satuan, "ml");
  });

  it("returns hasAbnormalCondition flag in result", async () => {
    const store = createInMemoryFluidStore();
    const result = await _createEntryCore(
      USER_ID,
      { tipe: "keluar", sumber: "urine", volume: 800, satuan: "ml", kondisiKeluar: "jernih" },
      store.insertEntry,
      encrypt,
      decrypt
    );
    assert.ok("hasAbnormalCondition" in result, "result must have hasAbnormalCondition");
    assert.strictEqual(result.hasAbnormalCondition, false);
  });

  it("capd_condition keruh → hasAbnormalCondition=true", async () => {
    const store = createInMemoryFluidStore();
    const result = await _createEntryCore(
      USER_ID,
      { tipe: "keluar", sumber: "urine", volume: 800, satuan: "ml", kondisiKeluar: "keruh" },
      store.insertEntry,
      encrypt,
      decrypt
    );
    assert.strictEqual(result.hasAbnormalCondition, true);
  });

  it("isLateEntry=true persists with is_late_entry flag", async () => {
    const store = createInMemoryFluidStore();
    const result = await _createEntryCore(
      USER_ID,
      { tipe: "keluar", sumber: "lainnya", volume: 700, satuan: "ml", waktu: "2026-06-25T06:00", isLateEntry: true },
      store.insertEntry,
      encrypt,
      decrypt
    );
    assert.strictEqual(result.entry.isLateEntry, true);
    // Verify the stored row also has isLateEntry=true
    assert.strictEqual(store.rows[0].isLateEntry, true);
  });

  it("catatan is stored as ciphertext (iv:authTag:cipher format in DB row)", async () => {
    const store = createInMemoryFluidStore();
    await _createEntryCore(
      USER_ID,
      { tipe: "keluar", sumber: "lainnya", volume: 500, satuan: "ml", catatan: "Cairan sedikit keruh" },
      store.insertEntry,
      encrypt,
      decrypt
    );
    // The DB row should have the ciphertext
    const storedCatatan = store.rows[0].catatan;
    assert.ok(storedCatatan, "catatan must not be null in DB row");
    const parts = storedCatatan.split(":");
    assert.strictEqual(parts.length, 3, "Stored catatan must be iv:authTag:cipher (3 parts)");
    assert.ok(storedCatatan !== "Cairan sedikit keruh", "Stored catatan must NOT be plaintext");
  });

  it("catatan is returned decrypted in entry.catatan", async () => {
    const store = createInMemoryFluidStore();
    const result = await _createEntryCore(
      USER_ID,
      { tipe: "keluar", sumber: "lainnya", volume: 500, satuan: "ml", catatan: "Cairan sedikit keruh" },
      store.insertEntry,
      encrypt,
      decrypt
    );
    // The returned entry must have decrypted plaintext
    assert.strictEqual(result.entry.catatan, "Cairan sedikit keruh");
  });

  it("catatan=undefined → stored catatan is null", async () => {
    const store = createInMemoryFluidStore();
    const result = await _createEntryCore(
      USER_ID,
      { tipe: "masuk", sumber: "lainnya", volume: 250, satuan: "ml" },
      store.insertEntry,
      encrypt,
      decrypt
    );
    assert.strictEqual(store.rows[0].catatan, null);
    assert.strictEqual(result.entry.catatan ?? null, null);
  });

  it("volume <= 0 is rejected before insertion", async () => {
    const store = createInMemoryFluidStore();
    await assert.rejects(
      () => _createEntryCore(
        USER_ID,
        { tipe: "masuk", sumber: "lainnya", volume: 0, satuan: "ml" },
        store.insertEntry,
        encrypt,
        decrypt
      ),
      (err: unknown) => err instanceof Error,
      "volume 0 must be rejected"
    );
    assert.strictEqual(store.rows.length, 0, "No row should be inserted on validation failure");
  });
});

// ─── balance: _getDailyBalanceCore with injected store ───────────────────────

describe("balance _getDailyBalanceCore", () => {
  it("returns masuk, keluar, delta=masuk-keluar, unit=ml for empty day", async () => {
    const store = createInMemoryFluidStore();
    const bal = await _getDailyBalanceCore(USER_ID, TODAY, store.getDailyBalance);
    assert.strictEqual(bal.masuk, 0);
    assert.strictEqual(bal.keluar, 0);
    assert.strictEqual(bal.delta, 0);
    assert.strictEqual(bal.unit, "ml");
  });

  it("delta = masuk - keluar after two masuk and one keluar", async () => {
    const store = createInMemoryFluidStore();
    // Seed entries
    await store.insertEntry({ userId: USER_ID, tanggal: TODAY, waktu: "08:00", tipe: "masuk", sumber: null, konsentrasiCapd: null, volume: 300, satuan: "ml", kondisiKeluar: null, catatan: null, isLateEntry: false });
    await store.insertEntry({ userId: USER_ID, tanggal: TODAY, waktu: "10:00", tipe: "masuk", sumber: null, konsentrasiCapd: null, volume: 200, satuan: "ml", kondisiKeluar: null, catatan: null, isLateEntry: false });
    await store.insertEntry({ userId: USER_ID, tanggal: TODAY, waktu: "12:00", tipe: "keluar", sumber: null, konsentrasiCapd: null, volume: 700, satuan: "ml", kondisiKeluar: "jernih", catatan: null, isLateEntry: false });

    const bal = await _getDailyBalanceCore(USER_ID, TODAY, store.getDailyBalance);
    assert.strictEqual(bal.masuk, 500);
    assert.strictEqual(bal.keluar, 700);
    assert.strictEqual(bal.delta, -200, "delta must be masuk - keluar");
    assert.strictEqual(bal.unit, "ml");
  });

  it("getDailyBalance only counts entries for the given date", async () => {
    const store = createInMemoryFluidStore();
    const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    await store.insertEntry({ userId: USER_ID, tanggal: YESTERDAY, waktu: "08:00", tipe: "masuk", sumber: null, konsentrasiCapd: null, volume: 999, satuan: "ml", kondisiKeluar: null, catatan: null, isLateEntry: false });
    await store.insertEntry({ userId: USER_ID, tanggal: TODAY, waktu: "08:00", tipe: "masuk", sumber: null, konsentrasiCapd: null, volume: 100, satuan: "ml", kondisiKeluar: null, catatan: null, isLateEntry: false });

    const bal = await _getDailyBalanceCore(USER_ID, TODAY, store.getDailyBalance);
    assert.strictEqual(bal.masuk, 100, "balance must only count today's entries");
  });

  it("getDailyBalance only counts entries for the given userId", async () => {
    const store = createInMemoryFluidStore();
    const OTHER_USER = "00000000-0000-0000-0000-000000000002";
    await store.insertEntry({ userId: OTHER_USER, tanggal: TODAY, waktu: "08:00", tipe: "masuk", sumber: null, konsentrasiCapd: null, volume: 5000, satuan: "ml", kondisiKeluar: null, catatan: null, isLateEntry: false });
    await store.insertEntry({ userId: USER_ID, tanggal: TODAY, waktu: "08:00", tipe: "masuk", sumber: null, konsentrasiCapd: null, volume: 250, satuan: "ml", kondisiKeluar: null, catatan: null, isLateEntry: false });

    const bal = await _getDailyBalanceCore(USER_ID, TODAY, store.getDailyBalance);
    assert.strictEqual(bal.masuk, 250, "balance must only count current user's entries");
  });
});
