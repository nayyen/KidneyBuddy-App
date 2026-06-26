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

export const createFluidSchema = z.object({
  tipe: z.enum(["masuk", "keluar"], {
    errorMap: () => ({ message: "Tipe harus 'masuk' atau 'keluar'" }),
  }),
  sumber: z
    .enum(["minuman", "makanan", "capd", "lainnya"], {
      errorMap: () => ({ message: "Sumber tidak valid" }),
    })
    .optional()
    .nullable(),
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
};

// ─── Injectable core functions (for unit testing) ────────────────────────────

type InsertFn = (data: NewFluidLog) => Promise<{
  id: string;
  userId: string;
  tanggal: string;
  waktu: string;
  tipe: string;
  sumber: string | null;
  konsentrasiCapd: string | null;
  volume: string | number;
  satuan: string;
  kondisiKeluar: string | null;
  catatan: string | null;
  isLateEntry: boolean;
  createdAt: Date;
}>;

type EncryptFn = (plaintext: string) => string;
type DecryptFn = (ciphertext: string) => string;

type GetDailyBalanceFn = (
  userId: string,
  date: string,
) => Promise<{ masuk: number; keluar: number; delta: number; unit: string }>;

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

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const defaultWaktu = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

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
    ...balance,
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
