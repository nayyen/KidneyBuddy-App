/**
 * educationContent.service.test.ts — TDD tests for education content browsing (EDU-01)
 *
 * Covers:
 *  - listContent: filtering by metodeTerapi returns only matching rows,
 *    never a different therapy method's content
 *
 * RED scaffold: educationContent.service.ts does not exist yet (built in 06-02).
 * This file fails at import until that plan lands — that is the intended
 * Wave 0 RED state (06-RESEARCH.md Test Map).
 *
 * Contract for 06-02 to implement against:
 *  - listContent(options?, deps?) — deps.findAll(options) => Promise<Row[]>,
 *    defaults to the real repository when omitted.
 *
 * Run: cd backend && node --import tsx --test src/test/educationContent.service.test.ts
 *
 * Pattern: follows labResult.service.test.ts's in-memory-store seam.
 */
import { describe, it } from "node:test";
import assert from "node:assert";

const { listContent } = await import("../services/educationContent.service.js");

// ─── In-memory store ─────────────────────────────────────────────────────────

function createInMemoryContentStore() {
  const rows = [
    { id: "1", judul: "Diet Rendah Cairan untuk CAPD", metodeTerapi: "CAPD", tipeKonten: "artikel" },
    { id: "2", judul: "Panduan Senam untuk Pasien CAPD", metodeTerapi: "CAPD", tipeKonten: "panduan_senam" },
    { id: "3", judul: "Persiapan Sebelum Sesi HD", metodeTerapi: "HD", tipeKonten: "artikel" },
    { id: "4", judul: "Gaya Hidup Sehat Pasca Transplantasi", metodeTerapi: "Transplantasi", tipeKonten: "gaya_hidup" },
    { id: "5", judul: "Mengelola Stres Selama Terapi", metodeTerapi: "Umum", tipeKonten: "artikel" },
  ];

  const findAll = async (options?: { metodeTerapi?: string; tipeKonten?: string }) => {
    return rows.filter((r) => {
      if (options?.metodeTerapi && r.metodeTerapi !== options.metodeTerapi) return false;
      if (options?.tipeKonten && r.tipeKonten !== options.tipeKonten) return false;
      return true;
    });
  };

  return { rows, findAll };
}

// ─── listContent — EDU-01 filter behavior ────────────────────────────────────

describe("listContent", () => {
  it("filters by metodeTerapi=CAPD, returning only CAPD rows, never HD/Transplantasi", async () => {
    const store = createInMemoryContentStore();

    const result = await listContent({ metodeTerapi: "CAPD" }, { findAll: store.findAll });

    assert.ok(result.length > 0);
    for (const row of result) {
      assert.strictEqual(row.metodeTerapi, "CAPD");
      assert.notStrictEqual(row.metodeTerapi, "HD");
      assert.notStrictEqual(row.metodeTerapi, "Transplantasi");
    }
  });

  it("with no filter returns all rows", async () => {
    const store = createInMemoryContentStore();

    const result = await listContent(undefined, { findAll: store.findAll });

    assert.strictEqual(result.length, store.rows.length);
  });
});
