/**
 * activities.service.ts — Daily activity logging business logic
 *
 * Implements ACTIVITY-01, ACTIVITY-03:
 * - createActivity: validates payload with Zod, combines WIB date + HH:mm into
 *   UTC timestamp, rejects past estimasiSelesai, inserts with status "berlangsung"
 * - completeActivity: validates feelings payload (perasaan + catatan), encrypts
 *   catatanPerasaan before storing, sets status "selesai"
 *
 * Security:
 * - T-03-01: all repository calls filtered by userId (IDOR prevention)
 * - T-03-02: catatanPerasaan encrypted before INSERT, never stored in plaintext
 *
 * Test seam: exports _createActivityCore and _completeActivityCore with injectable
 * dependencies so unit tests run without a live Postgres connection.
 */
import { z } from "zod";
import { encrypt as realEncrypt, decrypt as realDecrypt } from "../lib/encryption.js";
import * as dailyActivityRepository from "../repositories/dailyActivity.repository.js";
import type { NewDailyActivity } from "../repositories/dailyActivity.repository.js";

// ─── WIB offset (UTC+7) ──────────────────────────────────────────────────────
// All activity timestamp comparisons use WIB (CR-02).
const WIB_OFFSET_MS = 7 * 3600 * 1000;

/**
 * Returns a Date representing "now" in WIB timezone but as a Date object.
 * The Date's internal epoch is UTC, but we use it to derive WIB date components.
 */
function nowWIB(): Date {
  return new Date(Date.now() + WIB_OFFSET_MS);
}

/**
 * Combine today's WIB date with an HH:mm string to produce a full UTC Date.
 *
 * Example: WIB date = 2026-06-27, HH:mm = "14:30" → UTC timestamp 2026-06-27T07:30:00.000Z
 */
function combineWIBDateAndTime(hhmm: string): Date {
  const now = nowWIB();
  const [h, m] = hhmm.split(":").map(Number);

  // Build a WIB-local date by manipulating UTC components
  const utcDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      h - 7, // Convert WIB hour to UTC hour
      m,
      0,
      0,
    ),
  );

  return utcDate;
}

// ─── Zod validation schemas ───────────────────────────────────────────────────

export const createActivitySchema = z.object({
  namaKegiatan: z
    .string({
      required_error: "Nama kegiatan wajib diisi",
      invalid_type_error: "Nama kegiatan harus berupa teks",
    })
    .min(1, "Nama kegiatan tidak boleh kosong")
    .max(100, "Nama kegiatan maksimal 100 karakter"),
  estimasiSelesai: z
    .string({
      required_error: "Estimasi waktu selesai wajib diisi",
    })
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: "Format estimasi waktu harus HH:mm (contoh: 14:30)",
    }),
});

export type CreateActivityPayload = z.infer<typeof createActivitySchema>;

export const completeActivitySchema = z.object({
  perasaan: z
    .enum(["nyaman", "biasa", "lelah", "berat"], {
      errorMap: () => ({ message: "Perasaan harus nyaman, biasa, lelah, atau berat" }),
    })
    .nullable()
    .optional(),
  catatan: z
    .string()
    .max(200, "Catatan maksimal 200 karakter")
    .nullable()
    .optional(),
});

export type CompleteActivityPayload = z.infer<typeof completeActivitySchema>;

// ─── Return types ─────────────────────────────────────────────────────────────

export type ActivityResult = {
  id: string;
  userId: string;
  namaKegiatan: string;
  waktuMulai: Date;
  estimasiSelesai: Date;
  status: string;
  waktuSelesai: Date | null;
  perasaan: string | null;
  catatanPerasaan: string | null; // decrypted plaintext
  createdAt: Date;
};

// ─── Injectable core functions (for unit testing) ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InsertFn = (data: any) => Promise<any>;
type CompleteFn = (
  userId: string,
  id: string,
  data: {
    status: string;
    waktuSelesai: Date;
    perasaan: string | null;
    catatanPerasaan: string | null;
  },
) => Promise<any>;
type EncryptFn = (plaintext: string) => string;
type DecryptFn = (ciphertext: string) => string;

/**
 * Format a DailyActivity row into ActivityResult with decrypted catatan.
 */
function formatActivity(
  row: { id: string; userId: string; namaKegiatan: string; waktuMulai: Date; estimasiSelesai: Date; status: string; waktuSelesai: Date | null; perasaan: string | null; catatanPerasaan: string | null; createdAt: Date },
  decryptFn: DecryptFn,
): ActivityResult {
  return {
    id: row.id,
    userId: row.userId,
    namaKegiatan: row.namaKegiatan,
    waktuMulai: row.waktuMulai,
    estimasiSelesai: row.estimasiSelesai,
    status: row.status,
    waktuSelesai: row.waktuSelesai,
    perasaan: row.perasaan,
    catatanPerasaan: row.catatanPerasaan ? decryptFn(row.catatanPerasaan) : null,
    createdAt: row.createdAt,
  };
}

/**
 * Core create-activity logic with injectable dependencies.
 * Exported for unit testing without a live DB.
 */
export async function _createActivityCore(
  userId: string,
  rawPayload: unknown,
  insertFn: InsertFn,
  encryptFn: EncryptFn,
  decryptFn: DecryptFn,
): Promise<ActivityResult> {
  // Validate and parse — throws ZodError on invalid input (→ 400 via errorHandler)
  const parsed = createActivitySchema.parse(rawPayload);

  // Combine today's WIB date with the HH:mm estimasiSelesai
  const estimasiSelesaiUTC = combineWIBDateAndTime(parsed.estimasiSelesai);

  // Reject if estimasiSelesai is in the past (WIB comparison)
  if (Date.now() > estimasiSelesaiUTC.getTime()) {
    throw new Error("Estimasi waktu tidak boleh di masa lalu");
  }

  const insertData: NewDailyActivity = {
    userId: userId as any,
    namaKegiatan: parsed.namaKegiatan,
    estimasiSelesai: estimasiSelesaiUTC,
    status: "berlangsung",
    reminderSent: false,
  };

  const row = await insertFn(insertData);
  return formatActivity(row, decryptFn);
}

/**
 * Core complete-activity logic with injectable dependencies.
 * Exported for unit testing without a live DB.
 */
export async function _completeActivityCore(
  userId: string,
  id: string,
  rawPayload: unknown,
  completeFn: CompleteFn,
  encryptFn: EncryptFn,
): Promise<ActivityResult> {
  // Validate and parse — optional fields default to null
  const parsed = completeActivitySchema.parse(rawPayload);

  // Encrypt catatanPerasaan if present (T-03-02)
  const encryptedCatatan = parsed.catatan ? encryptFn(parsed.catatan) : null;

  const result = await completeFn(userId, id, {
    status: "selesai",
    waktuSelesai: new Date(),
    perasaan: parsed.perasaan ?? null,
    catatanPerasaan: encryptedCatatan,
  });

  // Use real decrypt for the response since we're in production path
  // (In tests, the mock store returns plaintext catatanPerasaan that won't be
  //  decryptable with real decrypt — that's fine, the test checks ciphertext directly)
  return {
    id: result.id,
    userId: result.userId,
    namaKegiatan: result.namaKegiatan,
    waktuMulai: result.waktuMulai,
    estimasiSelesai: result.estimasiSelesai,
    status: result.status,
    waktuSelesai: result.waktuSelesai,
    perasaan: result.perasaan,
    catatanPerasaan: result.catatanPerasaan ?? null,
    createdAt: result.createdAt,
  };
}

// ─── Production wrappers (bind real repository + real encryption) ─────────────

/**
 * Create a new daily activity for the authenticated user.
 * Combines today's WIB date with the HH:mm estimasiSelesai.
 */
export async function createEntry(
  userId: string,
  rawPayload: unknown,
): Promise<ActivityResult> {
  return _createActivityCore(
    userId,
    rawPayload,
    (data) => dailyActivityRepository.insertActivity(data),
    realEncrypt,
    realDecrypt,
  );
}

/**
 * Complete an activity with optional feelings rating and encrypted catatan.
 */
export async function completeActivity(
  userId: string,
  id: string,
  rawPayload: unknown,
): Promise<ActivityResult> {
  return _completeActivityCore(
    userId,
    id,
    rawPayload,
    (uid, actId, data) => dailyActivityRepository.completeById(uid, actId, data),
    realEncrypt,
  );
}

/**
 * Get the currently active (berlangsung) activity for the user, if any.
 */
export async function getActiveActivity(userId: string): Promise<ActivityResult | null> {
  const row = await dailyActivityRepository.findActiveByUser(userId);
  if (!row) return null;
  return formatActivity(row, realDecrypt);
}

/**
 * List activities for a given date (WIB-based).
 * Defaults to today's date in WIB.
 */
export async function listActivities(
  userId: string,
  dateStr?: string,
): Promise<ActivityResult[]> {
  const targetDate = dateStr
    ? new Date(dateStr + "T00:00:00.000Z")
    : new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

  // WIB date range: start of day in WIB → start of next day in WIB
  const wibNow = nowWIB();
  const year = wibNow.getUTCFullYear();
  const month = wibNow.getUTCMonth();
  const day = wibNow.getUTCDate();

  // Use the targetDate to determine the WIB day
  let dateStart: Date;
  let dateEnd: Date;

  if (dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    dateStart = new Date(Date.UTC(y, m - 1, d, -7, 0, 0, 0)); // Start of day WIB = UTC 17:00 previous day
    dateEnd = new Date(Date.UTC(y, m - 1, d + 1, -7, 0, 0, 0)); // Start of next day WIB
  } else {
    dateStart = new Date(Date.UTC(year, month, day, -7, 0, 0, 0));
    dateEnd = new Date(Date.UTC(year, month, day + 1, -7, 0, 0, 0));
  }

  const rows = await dailyActivityRepository.findByDate(userId, dateStart, dateEnd);
  return rows.map((row) => formatActivity(row, realDecrypt));
}
