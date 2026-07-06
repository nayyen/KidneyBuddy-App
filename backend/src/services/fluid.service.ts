/**
 * fluid.service.ts — Fluid tracking business logic
 *
 * Implements FLUID-01..05:
 * - createEntry: validates payload, encrypts catatan, flags CAPD abnormal conditions
 * - getDailyBalance: delegates to repository (server-computed, never client-side)
 *
 * Security:
 * - T-02-04-01: all repo calls filter by userId
 * - T-02-04-02: catatan encrypted before INSERT, decrypted after SELECT
 * - T-02-04-03: zod validation rejects volume <= 0 and invalid enums
 * - T-02-04-04: balance computed only in backend
 *
 * Test seam: exports _createEntryCore and _getDailyBalanceCore with injectable
 * dependencies (following notification.service.ts pattern) so unit tests can run
 * without a live Postgres connection.
 */
import { z } from "zod";
import { encrypt as realEncrypt, decrypt as realDecrypt } from "../lib/encryption.js";
import * as fluidLogRepository from "../repositories/fluidLog.repository.js";
import type { NewFluidLog } from "../repositories/fluidLog.repository.js";
import { wibDateStr, wibHHmm } from "../utils/wib.js";
import { AppError } from "../middleware/errorHandler.js";

// ─── CAPD abnormal effluent conditions (FLUID-03) ────────────────────────────

const ABNORMAL_CONDITIONS = new Set(["keruh", "keruh_gumpalan", "berdarah"]);

/**
 * Determine whether a CAPD effluent condition is abnormal.
 * Pure function — no I/O, fully testable.
 */
export function computeHasAbnormalCondition(
  kondisiKeluar: string | null | undefined,
): boolean {
  if (!kondisiKeluar) return false;
  return ABNORMAL_CONDITIONS.has(kondisiKeluar);
}

// ─── Zod validation schema (FLUID-01, T-02-04-03) ────────────────────────────

// F2 (quick-260705-9n4 task 11): "makanan"/"minuman" added so the Sumber
// dropdown can offer Makanan/Minuman for Cairan Masuk (fluid IN) instead of
// wrongly reusing "urine" (which is a Cairan Keluar/fluid OUT-only source).
// "urine"/"capd"/"lainnya" are kept — urine remains valid for keluar.
const FLUID_SUMBER = ["urine", "capd", "lainnya", "makanan", "minuman"] as const;
const SUMBER_MASUK_ONLY = new Set(["makanan", "minuman"]);
const SUMBER_KELUAR_ONLY = new Set(["urine"]);

export const createFluidSchema = z
  .object({
    tipe: z.enum(["masuk", "keluar"], {
      errorMap: () => ({ message: "Tipe harus 'masuk' atau 'keluar'" }),
    }),
    // F1 (quick-260705-9n4 task 11): Sumber is now a REQUIRED field for every
    // fluid entry (masuk or keluar) — every entry must say what kind of
    // fluid it is. Previously optional, which is why the frontend's
    // "(opsional)" label was misleadingly cosmetic rather than reflecting
    // real validation.
    sumber: z.enum(FLUID_SUMBER, {
      errorMap: (issue) => ({
        message:
          issue.code === "invalid_type"
            ? "Sumber wajib diisi"
            : "Sumber tidak valid",
      }),
    }),
    konsentrasiCapd: z
      .enum(["1.5%", "2.5%", "4.25%", "icodextrin_7.5%", "lainnya"], {
        errorMap: () => ({ message: "Konsentrasi CAPD tidak valid" }),
      })
      .optional()
      .nullable(),
    volume: z
      .number({
        required_error: "Volume wajib diisi",
        invalid_type_error: "Volume harus berupa angka",
      })
      .positive("Volume harus lebih dari 0 ml"),
    satuan: z.enum(["ml", "kg"]).default("ml"),
    kondisiKeluar: z
      .enum(["jernih", "keruh", "keruh_gumpalan", "berdarah"], {
        errorMap: () => ({ message: "Kondisi keluar tidak valid" }),
      })
      .optional()
      .nullable(),
    catatan: z.string().max(2000).optional().nullable(),
    tanggal: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
      .optional(),
    waktu: z.string().optional(),
    isLateEntry: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    // F2: reject nonsensical tipe/sumber combos server-side too (defense in
    // depth — the frontend dropdown already restricts the option list per
    // tipe, but the API must not silently accept a bypassed/direct request).
    if (data.tipe === "masuk" && SUMBER_KELUAR_ONLY.has(data.sumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sumber"],
        message: "Urine hanya berlaku untuk Cairan Keluar",
      });
    }
    if (data.tipe === "keluar" && SUMBER_MASUK_ONLY.has(data.sumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sumber"],
        message: "Makanan/Minuman hanya berlaku untuk Cairan Masuk",
      });
    }
    // Konsentrasi CAPD is required precisely when sumber is the CAPD
    // exchange source — mirrors the frontend's conditional "(opsional)"
    // label logic, but now actually enforced.
    if (data.sumber === "capd" && !data.konsentrasiCapd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["konsentrasiCapd"],
        message: "Konsentrasi CAPD wajib diisi untuk sumber Exchange CAPD",
      });
    }
    // quick-260707-8je item 2: server stays the source of truth — Kondisi
    // Cairan Keluar is required precisely when sumber is Exchange CAPD AND
    // tipe is keluar; never demanded for non-CAPD sources.
    if (
      data.sumber === "capd" &&
      data.tipe === "keluar" &&
      !data.kondisiKeluar
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kondisiKeluar"],
        message: "Kondisi cairan keluar wajib diisi untuk sumber Exchange CAPD",
      });
    }
  });

export type CreateFluidPayload = z.infer<typeof createFluidSchema>;

// ─── Return types ─────────────────────────────────────────────────────────────

export type FluidEntryResult = {
  entry: {
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
    catatan: string | null; // decrypted plaintext
    isLateEntry: boolean;
    createdAt: Date;
  };
  hasAbnormalCondition: boolean;
};

export type DailyBalanceResult = {
  date: string;
  masuk: number;
  keluar: number;
  delta: number;
  unit: string;
  hasAbnormalCondition: boolean;
};

// ─── Injectable core functions (for unit testing) ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InsertFn = (data: any) => Promise<any>;

type EncryptFn = (plaintext: string) => string;
type DecryptFn = (ciphertext: string) => string;

type GetDailyBalanceFn = (
  userId: string,
  date: string,
) => Promise<{ masuk: number; keluar: number; delta: number; unit: string; hasAbnormalCondition: boolean }>;

/**
 * Core create-entry logic with injectable dependencies.
 * Exported for unit testing without a live DB.
 */
export async function _createEntryCore(
  userId: string,
  rawPayload: unknown,
  insertFn: InsertFn,
  encryptFn: EncryptFn,
  _decryptFn: DecryptFn,
): Promise<FluidEntryResult> {
  // Validate and parse — throws ZodError on invalid input (→ 400 via errorHandler)
  const parsed = createFluidSchema.parse(rawPayload);

  // WIB-correct date + time (container runs UTC; 7am WIB = 00:xx UTC)
  const today = wibDateStr();
  const defaultWaktu = wibHHmm();

  // Encrypt catatan before INSERT (T-02-04-02)
  const encryptedCatatan = parsed.catatan ? encryptFn(parsed.catatan) : null;

  const insertData: NewFluidLog = {
    userId: userId as any,
    tanggal: parsed.tanggal ?? today,
    waktu: parsed.waktu ?? defaultWaktu,
    tipe: parsed.tipe,
    sumber: parsed.sumber ?? null,
    konsentrasiCapd: parsed.konsentrasiCapd ?? null,
    volume: String(parsed.volume),
    satuan: parsed.satuan,
    kondisiKeluar: parsed.kondisiKeluar ?? null,
    catatan: encryptedCatatan,
    isLateEntry: parsed.isLateEntry,
  };

  const created = await insertFn(insertData);
  const hasAbnormalCondition = computeHasAbnormalCondition(created.kondisiKeluar);

  return {
    entry: {
      id: created.id,
      userId: created.userId,
      tanggal: created.tanggal,
      waktu: created.waktu,
      tipe: created.tipe,
      sumber: created.sumber,
      konsentrasiCapd: created.konsentrasiCapd,
      volume: Number(created.volume),
      satuan: created.satuan,
      kondisiKeluar: created.kondisiKeluar,
      // Return decrypted plaintext so the caller never handles ciphertext
      catatan: created.catatan ? _decryptFn(created.catatan) : null,
      isLateEntry: created.isLateEntry,
      createdAt: created.createdAt,
    },
    hasAbnormalCondition,
  };
}

/**
 * Core daily-balance logic with injectable dependencies.
 * Exported for unit testing without a live DB.
 */
export async function _getDailyBalanceCore(
  userId: string,
  date: string,
  getDailyBalanceFn: GetDailyBalanceFn,
): Promise<DailyBalanceResult> {
  const balance = await getDailyBalanceFn(userId, date);
  return {
    date,
    masuk: balance.masuk,
    keluar: balance.keluar,
    delta: balance.delta,
    unit: balance.unit,
    hasAbnormalCondition: balance.hasAbnormalCondition,
  };
}

// ─── Production entry points (use real dependencies) ─────────────────────────

/**
 * Create a fluid log entry for the authenticated user.
 * Encrypts catatan, flags CAPD abnormal effluent, persists to Postgres.
 */
export async function createEntry(
  userId: string,
  payload: unknown,
): Promise<FluidEntryResult> {
  return _createEntryCore(
    userId,
    payload,
    fluidLogRepository.insertEntry,
    realEncrypt,
    realDecrypt,
  );
}

/**
 * Get the daily fluid balance for the authenticated user.
 * Balance is always computed on the server — never on the client (T-02-04-04).
 */
export async function getDailyBalance(
  userId: string,
  date: string,
): Promise<DailyBalanceResult> {
  return _getDailyBalanceCore(userId, date, fluidLogRepository.getDailyBalance);
}

/**
 * Get fluid entries for a specific date with hasAbnormalCondition per row.
 * Used by GET /api/fluid?date=... and the daily-balance endpoint's entries array.
 */
export async function getEntriesByDate(
  userId: string,
  date: string,
) {
  const rows = await fluidLogRepository.findByDate(userId, date);
  return rows.map((row) => ({
    id: row.id,
    waktu: row.waktu,
    tipe: row.tipe,
    sumber: row.sumber,
    konsentrasiCapd: row.konsentrasiCapd,
    volume: Number(row.volume),
    satuan: row.satuan,
    kondisiKeluar: row.kondisiKeluar,
    // Decrypt catatan — safely handle null
    catatan: row.catatan ? realDecrypt(row.catatan) : null,
    isLateEntry: row.isLateEntry,
    hasAbnormalCondition: computeHasAbnormalCondition(row.kondisiKeluar),
    createdAt: row.createdAt,
  }));
}

/**
 * Get fluid entries from the last N days, including the tanggal field
 * so the frontend can group by date (Hari Ini / Kemarin / Tanggal).
 */
export async function getRecentEntries(
  userId: string,
  days: number = 7,
) {
  const rows = await fluidLogRepository.findRecentByUser(userId, days);
  return rows.map((row) => ({
    id: row.id,
    tanggal: row.tanggal,
    waktu: row.waktu,
    tipe: row.tipe,
    sumber: row.sumber,
    konsentrasiCapd: row.konsentrasiCapd,
    volume: Number(row.volume),
    satuan: row.satuan,
    kondisiKeluar: row.kondisiKeluar,
    catatan: row.catatan ? realDecrypt(row.catatan) : null,
    isLateEntry: row.isLateEntry,
    hasAbnormalCondition: computeHasAbnormalCondition(row.kondisiKeluar),
    createdAt: row.createdAt,
  }));
}
  /**
   * Update an existing fluid log entry.
   * Only allows updating volume, sumber, konsentrasiCapd, kondisiKeluar, and catatan.
   * Returns the updated entry or undefined if not found.
   *
   * BUGFIX (quick-260705-9n4 task 11 audit): this partial-update path had NO
   * validation whatsoever — any string could be written to `sumber`,
   * bypassing createFluidSchema's enum entirely. Added a minimal enum check
   * on `sumber` (when provided) using the same FLUID_SUMBER set as create,
   * so an edit can't silently corrupt the field with a value that would
   * never render correctly in the frontend's Sumber dropdown. Full
   * tipe-aware cross-field validation (masuk/keluar-only sources) is not
   * applied here since `tipe` itself is intentionally NOT editable via this
   * path (not in EDITABLE_FIELDS) — out of scope for this fix.
   */
  export async function updateEntry(
    userId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    if (data.sumber !== undefined && data.sumber !== null) {
      const sumberResult = z.enum(FLUID_SUMBER).safeParse(data.sumber);
      if (!sumberResult.success) {
        throw new AppError(400, "INVALID_SUMBER", "Sumber tidak valid");
      }
    }

    const allowed: Record<string, unknown> = {};
    const EDITABLE_FIELDS = ["volume", "sumber", "konsentrasiCapd", "kondisiKeluar", "catatan"];
    for (const key of EDITABLE_FIELDS) {
      if (data[key] !== undefined) {
        allowed[key] = key === "catatan" && data[key] ? realEncrypt(String(data[key])) : data[key];
      }
    }
    if (Object.keys(allowed).length === 0) return undefined;
      const updated = await fluidLogRepository.updateById(userId, id, allowed as any);
    if (!updated) return undefined;
    return {
      id: updated.id,
      waktu: updated.waktu,
      tipe: updated.tipe,
      sumber: updated.sumber,
      konsentrasiCapd: updated.konsentrasiCapd,
      volume: Number(updated.volume),
      satuan: updated.satuan,
      kondisiKeluar: updated.kondisiKeluar,
      catatan: updated.catatan ? realDecrypt(updated.catatan) : null,
      isLateEntry: updated.isLateEntry,
      hasAbnormalCondition: computeHasAbnormalCondition(updated.kondisiKeluar),
      createdAt: updated.createdAt,
    };
  }

  /**
   * deleteEntry — permanently delete a fluid log entry (IDOR-safe).
   * Returns true if deleted, false if not found.
   */
  export async function deleteEntry(
    userId: string,
    id: string,
  ): Promise<boolean> {
    // Reuse updateById's IDOR-safe pattern: check ownership via repository
    const deleted = await fluidLogRepository.deleteById(userId, id);
    return deleted;
  }
