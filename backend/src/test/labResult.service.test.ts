/**
 * labResult.service.test.ts — TDD tests for lab result manual entry (LAB-02)
 *
 * Covers:
 *  - createLab: valid payload returns correct fields
 *  - createLab: missing required fields are rejected
 *  - createLab: invalid date format is rejected
 *  - createLab: catatan is encrypted before storage
 *
 * Run: cd backend && node --import tsx --test src/test/labResult.service.test.ts
 *
 * Pattern: follows activity.service.test.ts — injectable core functions.
 */
import { describe, it } from "node:test";
import assert from "node:assert";

// Set ENCRYPTION_KEY before module imports
const TEST_KEY = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3";
process.env.ENCRYPTION_KEY = TEST_KEY;

const { encrypt, decrypt } = await import("../lib/encryption.js");
const { createLabSchema, _createLabCore } = await import("../services/labResult.service.js");

const USER_ID = "00000000-0000-0000-0000-000000000001";

// ─── In-memory store ─────────────────────────────────────────────────────────

function createInMemoryLabStore() {
  const rows: Array<Record<string, unknown>> = [];
  let counter = 0;

  const insertLab = async (data: Record<string, unknown>) => {
    const row = {
      id: `test-id-${++counter}`,
      userId: data.userId,
      tanggalPemeriksaan: data.tanggalPemeriksaan,
      kategori: data.kategori ?? null,
      namaParameter: data.namaParameter,
      nilai: data.nilai,
      satuan: data.satuan ?? null,
      nilaiRujukan: data.nilaiRujukan ?? null,
      catatan: data.catatan ?? null,
      sumber: data.sumber ?? "manual",
      diarsipkan: data.diarsipkan ?? false,
      createdAt: new Date(),
    };
    rows.push(row);
    return row;
  };

  return { rows, insertLab };
}

// ─── Schema validation ────────────────────────────────────────────────────────

describe("lab schema validation", () => {
  it("valid payload passes schema", () => {
    const result = createLabSchema.safeParse({
      tanggalPemeriksaan: "2026-06-28",
      namaParameter: "Kreatinin",
      nilai: "1.2",
      satuan: "mg/dL",
      nilaiRujukan: "0.6-1.2",
    });
    assert.strictEqual(result.success, true);
  });

  it("missing tanggalPemeriksaan is rejected", () => {
    const result = createLabSchema.safeParse({
      namaParameter: "Kreatinin",
      nilai: "1.2",
    });
    assert.strictEqual(result.success, false);
  });

  it("invalid date format is rejected", () => {
    const result = createLabSchema.safeParse({
      tanggalPemeriksaan: "28-06-2026",
      namaParameter: "Kreatinin",
      nilai: "1.2",
    });
    assert.strictEqual(result.success, false);
  });

  it("missing namaParameter is rejected", () => {
    const result = createLabSchema.safeParse({
      tanggalPemeriksaan: "2026-06-28",
      nilai: "1.2",
    });
    assert.strictEqual(result.success, false);
  });

  it("empty nilai is rejected", () => {
    const result = createLabSchema.safeParse({
      tanggalPemeriksaan: "2026-06-28",
      namaParameter: "Kreatinin",
      nilai: "",
    });
    assert.strictEqual(result.success, false);
  });

  it("optional fields (kategori, satuan, nilaiRujukan, catatan) are optional", () => {
    const result = createLabSchema.safeParse({
      tanggalPemeriksaan: "2026-06-28",
      namaParameter: "Kreatinin",
      nilai: "1.2",
    });
    assert.strictEqual(result.success, true);
  });
});

// ─── _createLabCore with injected store ──────────────────────────────────────

describe("lab _createLabCore", () => {
  it("createLab with valid payload returns correct fields", async () => {
    const store = createInMemoryLabStore();

    const result = await _createLabCore(
      USER_ID,
      {
        tanggalPemeriksaan: "2026-06-28",
        namaParameter: "Kreatinin",
        nilai: "1.2",
        satuan: "mg/dL",
        nilaiRujukan: "0.6-1.2",
        kategori: "Fungsi Ginjal",
      },
      store.insertLab,
      encrypt,
      decrypt,
    );

    assert.strictEqual(result.namaParameter, "Kreatinin");
    assert.strictEqual(result.nilai, "1.2");
    assert.strictEqual(result.satuan, "mg/dL");
    assert.strictEqual(result.nilaiRujukan, "0.6-1.2");
    assert.strictEqual(result.kategori, "Fungsi Ginjal");
    assert.strictEqual(result.sumber, "manual");
    assert.strictEqual(result.diarsipkan, false);
    assert.strictEqual(result.catatan, null);
  });

  it("createLab with catatan encrypts the note", async () => {
    const store = createInMemoryLabStore();
    const originalCatatan = "Hasil lab menunjukkan perbaikan";

    const result = await _createLabCore(
      USER_ID,
      {
        tanggalPemeriksaan: "2026-06-28",
        namaParameter: "Hemoglobin",
        nilai: "12.5",
        satuan: "g/dL",
        catatan: originalCatatan,
      },
      store.insertLab,
      encrypt,
      decrypt,
    );

    // catatan stored as ciphertext in memory
    const storedRow = store.rows[0];
    assert.notStrictEqual(storedRow.catatan, originalCatatan, "catatan must be encrypted");

    // Returned value should be decrypted
    assert.strictEqual(result.catatan, originalCatatan, "returned catatan should be plaintext");

    // Verify round-trip
    if (storedRow.catatan && typeof storedRow.catatan === "string") {
      const decrypted = decrypt(storedRow.catatan);
      assert.strictEqual(decrypted, originalCatatan);
    }
  });

  it("createLab without optional fields works", async () => {
    const store = createInMemoryLabStore();

    const result = await _createLabCore(
      USER_ID,
      {
        tanggalPemeriksaan: "2026-06-28",
        namaParameter: "Kalium",
        nilai: "4.5",
      },
      store.insertLab,
      encrypt,
      decrypt,
    );

    assert.strictEqual(result.namaParameter, "Kalium");
    assert.strictEqual(result.nilai, "4.5");
    assert.strictEqual(result.satuan, null);
    assert.strictEqual(result.nilaiRujukan, null);
    assert.strictEqual(result.kategori, null);
    assert.strictEqual(result.catatan, null);
  });
});
