/**
 * labResult.service.ts — Lab result business logic
 *
 * Implements LAB-02 (manual entry) and LAB-04 (archive/soft-delete):
 * - createLabEntry: validates payload with Zod, encrypts catatan, inserts row
 * - listLabResults: fetch by user with optional date/parameter filters
 * - archiveLabResult: set diarsipkan = true (never hard-delete)
 *
 * Security:
 * - T-04-01: all repository calls filtered by userId (IDOR prevention)
 * - T-04-02: catatan encrypted before INSERT, decrypted after SELECT
 *
 * Test seam: exports _createLabCore with injectable dependencies.
 */
import { z } from "zod";
import { encrypt as realEncrypt, decrypt as realDecrypt } from "../lib/encryption.js";
import * as labResultRepository from "../repositories/labResult.repository.js";
import type { NewLabResult } from "../repositories/labResult.repository.js";

// ─── Zod validation schemas ───────────────────────────────────────────────────

export const createLabSchema = z.object({
  tanggalPemeriksaan: z
    .string({
      required_error: "Tanggal pemeriksaan wajib diisi",
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Format tanggal harus YYYY-MM-DD",
    }),
  kategori: z
    .string()
    .max(50, "Kategori maksimal 50 karakter")
    .nullable()
    .optional(),
  namaParameter: z
    .string({
      required_error: "Nama parameter wajib diisi",
    })
    .min(1, "Nama parameter tidak boleh kosong")
    .max(100, "Nama parameter maksimal 100 karakter"),
  nilai: z
    .string({
      required_error: "Nilai wajib diisi",
    })
    .min(1, "Nilai tidak boleh kosong")
    .max(50, "Nilai maksimal 50 karakter"),
  satuan: z
    .string()
    .max(20, "Satuan maksimal 20 karakter")
    .nullable()
    .optional(),
  nilaiRujukan: z
    .string()
    .max(50, "Nilai rujukan maksimal 50 karakter")
    .nullable()
    .optional(),
  catatan: z
    .string()
    .max(2000, "Catatan maksimal 2000 karakter")
    .nullable()
    .optional(),
});

export type CreateLabPayload = z.infer<typeof createLabSchema>;

// ─── Return types ─────────────────────────────────────────────────────────────

export type LabResultResult = {
  id: string;
  userId: string;
  tanggalPemeriksaan: string;
  kategori: string | null;
  namaParameter: string;
  nilai: string;
  satuan: string | null;
  nilaiRujukan: string | null;
  catatan: string | null; // decrypted plaintext
  sumber: string;
  diarsipkan: boolean;
  fileId: string | null; // Added fileId
  createdAt: Date;
};

// ─── Injectable core functions ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InsertFn = (data: any) => Promise<any>;
type EncryptFn = (plaintext: string) => string;
type DecryptFn = (ciphertext: string) => string;

function formatLabRow(
  row: {
    id: string;
    userId: string;
    tanggalPemeriksaan: string;
    kategori: string | null;
    namaParameter: string;
    nilai: string;
    satuan: string | null;
    nilaiRujukan: string | null;
    catatan: string | null;
    sumber: string;
    diarsipkan: boolean;
    createdAt: Date;
    fileId: string | null; // Added fileId
  },
  decryptFn: DecryptFn,
): LabResultResult {
  return {
    id: row.id,
    userId: row.userId,
    tanggalPemeriksaan: row.tanggalPemeriksaan,
    kategori: row.kategori,
    namaParameter: row.namaParameter,
    nilai: row.nilai,
    satuan: row.satuan,
    nilaiRujukan: row.nilaiRujukan,
    catatan: row.catatan ? decryptFn(row.catatan) : null,
    sumber: row.sumber,
    diarsipkan: row.diarsipkan,
    createdAt: row.createdAt,
    fileId: row.fileId, // Added fileId
  };
}

/**
 * Update an existing manual lab result entry (editable fields).
 * Does NOT allow updating fileId or sumber fields.
 */
export async function updateEntry(
  userId: string,
  id: string,
  data: Record<string, unknown>,
) {
  const allowed: Record<string, unknown> = {};
  const EDITABLE = [
    "tanggalPemeriksaan",
    "kategori",
    "namaParameter",
    "nilai",
    "satuan",
    "nilaiRujukan",
    "catatan",
  ];
  for (const key of EDITABLE) {
    if (data[key] !== undefined) {
      allowed[key] = key === "catatan" && data[key]
        ? realEncrypt(String(data[key]))
        : data[key];
    }
  }
  if (Object.keys(allowed).length === 0) return undefined;
  const updated = await labResultRepository.updateById(userId, id, allowed);
  if (!updated) return undefined;
  return {
    id: updated.id,
    tanggalPemeriksaan: updated.tanggalPemeriksaan,
    kategori: updated.kategori,
    namaParameter: updated.namaParameter,
    nilai: updated.nilai,
    satuan: updated.satuan,
    nilaiRujukan: updated.nilaiRujukan,
    sumber: updated.sumber,
    fileId: updated.fileId,
    catatan: updated.catatan ? realDecrypt(updated.catatan) : null,
    diarsipkan: updated.diarsipkan,
    createdAt: updated.createdAt,
  };
}

/**
 * Core create-lab logic with injectable dependencies.
 * Exported for unit testing without a live DB.
 */
export async function _createLabCore(
  userId: string,
  rawPayload: unknown,
  insertFn: InsertFn,
  encryptFn: EncryptFn,
  decryptFn: DecryptFn,
): Promise<LabResultResult> {
  const parsed = createLabSchema.parse(rawPayload);

  const encryptedCatatan = parsed.catatan ? encryptFn(parsed.catatan) : null;

  const insertData: NewLabResult = {
    userId: userId as any,
    tanggalPemeriksaan: parsed.tanggalPemeriksaan,
    kategori: parsed.kategori ?? null,
    namaParameter: parsed.namaParameter,
    nilai: parsed.nilai,
    satuan: parsed.satuan ?? null,
    nilaiRujukan: parsed.nilaiRujukan ?? null,
    catatan: encryptedCatatan,
    sumber: "manual",
    diarsipkan: false,
  };

  const row = await insertFn(insertData);
  return formatLabRow(row, decryptFn);
}

// ─── Production wrappers ──────────────────────────────────────────────────────

/**
 * Create a new manual lab result entry.
 */
export async function createEntry(
  userId: string,
  rawPayload: unknown,
): Promise<LabResultResult> {
  return _createLabCore(
    userId,
    rawPayload,
    (data) => labResultRepository.insertLabResult(data),
    realEncrypt,
    realDecrypt,
  );
}

/**
 * List lab results with optional filters.
 */
export async function listResults(
  userId: string,
  query?: { tanggal?: string; parameter?: string },
): Promise<LabResultResult[]> {
  const rows = await labResultRepository.findByUser(userId, {
    tanggal: query?.tanggal,
    parameter: query?.parameter,
  });
  return rows.map((row) => formatLabRow(row, realDecrypt));
}

/**
 * Get distinct parameter names the user has logged.
 */
export async function getDistinctParameters(userId: string): Promise<string[]> {
  return labResultRepository.findDistinctParameters(userId);
}

/**
 * Archive (soft-delete) a lab result.
 */
export async function archiveResult(
  userId: string,
  id: string,
): Promise<LabResultResult | null> {
  const row = await labResultRepository.archiveById(userId, id);
  if (!row) return null;
  return formatLabRow(row, realDecrypt);
}

/**
 * Restore an archived lab result (set diarsipkan = false).
 */
export async function restoreResult(
  userId: string,
  id: string,
): Promise<LabResultResult | null> {
  const row = await labResultRepository.restoreById(userId, id);
  if (!row) return null;
  return formatLabRow(row, realDecrypt);
}

/**
 * List archived lab results only.
 */
export async function listArchived(userId: string): Promise<LabResultResult[]> {
  const rows = await labResultRepository.findByUser(userId, { includeArchived: true });
  return rows.filter((r) => r.diarsipkan).map((row) => formatLabRow(row, realDecrypt));
}

// ─── Upload (LAB-05) ──────────────────────────────────────────────────────────

export interface UploadResult {
  id: string;
  fileId: string;
  tanggalPemeriksaan: string;
  sumber: "upload";
  originalName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Create a lab result entry for an uploaded file.
 * Stores the file reference with sumber='upload' and placeholder parameter values
 * (since the file hasn't been parsed into individual parameters yet).
 */
export async function createUploadEntry(
  userId: string,
  tanggalPemeriksaan: string,
  fileInfo: {
    fileId: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    namaFile?: string;
  },
): Promise<UploadResult> {
  // Use user-provided name as the display label; fall back to original filename
  const displayNama = fileInfo.namaFile?.trim() || fileInfo.originalName || "Dokumen Lab";
  const payload: NewLabResult = {
    userId: userId as any,
    tanggalPemeriksaan,
    namaParameter: displayNama,
    nilai: "(file)",
    kategori: "Dokumen Lab",
    sumber: "upload",
    fileId: fileInfo.fileId as any,
    diarsipkan: false,
  };

  const row = await labResultRepository.insertLabResult(payload);
  return {
    id: row.id,
    fileId: fileInfo.fileId,
    tanggalPemeriksaan: row.tanggalPemeriksaan,
    sumber: "upload",
    originalName: fileInfo.originalName,
    mimeType: fileInfo.mimeType,
    fileSize: fileInfo.fileSize,
  };
}

// ─── Trend data (LAB-06) ──────────────────────────────────────────────────────

export interface TrendPoint {
  tanggalPemeriksaan: string;
  nilai: string;
  satuan: string | null;
}

/**
 * Get trend data for a specific parameter within a lookback window.
 * Returns data points ordered by date ascending.
 */
export async function getTrendData(
  userId: string,
  parameter: string,
  days: number = 30,
): Promise<TrendPoint[]> {
  const rows = await labResultRepository.findTrendData(userId, parameter, days);

  return rows.map((row) => ({
    tanggalPemeriksaan: row.tanggalPemeriksaan,
    nilai: row.nilai,
    satuan: row.satuan,
  }));
}
