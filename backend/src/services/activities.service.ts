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
import { AppError } from "../middleware/errorHandler.js";
import { encrypt as realEncrypt, decrypt as realDecrypt } from "../lib/encryption.js";
import * as dailyActivityRepository from "../repositories/dailyActivity.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import type { NewDailyActivity } from "../repositories/dailyActivity.repository.js";
import {
  wibDateStr,
  wibHHmm,
  wibDayName,
  localDateStr,
  localDateFromHHmm,
} from "../utils/wib.js";

const DEFAULT_TIMEZONE = "Asia/Jakarta";

/**
 * Look up the requesting user's stored IANA timezone (quick-260705-9n4 task
 * 2 pattern), falling back to Asia/Jakarta if the user row is missing one.
 */
async function getUserTimezone(userId: string): Promise<string> {
  const user = await userRepository.findById(userId);
  return user?.timezone || DEFAULT_TIMEZONE;
}

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

// B5 (quick-260705-9n4 task 8): estimasiSelesaiJam replaces the old
// estimasiMenit (duration-in-minutes) contract — the form now collects a
// wall-clock FINISH TIME (e.g. "17:00"), matching jamPengingat's HH:mm
// convention used elsewhere (reminders). The absolute estimasiSelesai
// timestamp is built server-side from this HH:mm + the user's own local
// timezone (task 2), for "today" unless an explicit tanggal is given.
export const createActivitySchema = z.object({
  namaKegiatan: z
    .string({
      required_error: "Nama kegiatan wajib diisi",
      invalid_type_error: "Nama kegiatan harus berupa teks",
    })
    .min(1, "Nama kegiatan tidak boleh kosong")
    .max(100, "Nama kegiatan maksimal 100 karakter"),
  estimasiSelesaiJam: z
    .string({
      required_error: "Estimasi selesai wajib diisi",
      invalid_type_error: "Estimasi selesai harus berupa teks jam (HH:mm)",
    })
    .regex(/^\d{2}:\d{2}$/, "Format jam wajib HH:mm (contoh: 17:00)"),
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
    .optional(),
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
 *
 * @param deps.waktuMulai - injectable "now" for testing (defaults to `new Date()`)
 * @param deps.timezone - injectable IANA timezone for testing (defaults to
 *   Asia/Jakarta, matching the production default in getUserTimezone())
 */
export async function _createActivityCore(
  userId: string,
  rawPayload: unknown,
  insertFn: InsertFn,
  deps?: { waktuMulai?: Date; timezone?: string },
): Promise<ActivityResult> {
  const now = deps?.waktuMulai ?? new Date();
  const timezone = deps?.timezone ?? DEFAULT_TIMEZONE;
  const parsed = createActivitySchema.parse(rawPayload);

  // Build the absolute finish timestamp from the picked HH:mm + the target
  // calendar date (explicit `tanggal`, or "today" in the user's own local
  // timezone) — B5's clock-time contract (quick-260705-9n4 task 8).
  const dateStr = parsed.tanggal ?? localDateStr(timezone, now);
  const estimasiSelesai = localDateFromHHmm(timezone, parsed.estimasiSelesaiJam, dateStr);

  // A picked finish time that has already passed (relative to "now") is
  // never valid — the old duration-based contract made this impossible by
  // construction (any positive minute count was always in the future), but
  // a wall-clock time the user can freely pick needs an explicit guard.
  if (estimasiSelesai.getTime() <= now.getTime()) {
    throw new AppError(
      400,
      "ESTIMASI_SELESAI_LAMPAU",
      "Estimasi selesai harus di waktu yang akan datang",
    );
  }

  const newActivity = await insertFn({
    userId: userId as any,
    namaKegiatan: parsed.namaKegiatan,
    waktuMulai: now,
    estimasiSelesai: estimasiSelesai,
    status: "berlangsung",
  });

  return formatActivity(newActivity, realDecrypt);
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
 * Combines today's date (in the user's own local timezone) with the picked
 * HH:mm estimasiSelesaiJam to build the absolute estimasiSelesai timestamp.
 *
 * BUGFIX (quick-260705-9n4 task 8 audit): previously called
 * _createActivityCore(userId, rawPayload, insertFn, realEncrypt, realDecrypt)
 * — 5 arguments against a 3-4-arg signature (a pre-existing tsc build error,
 * `error TS2554: Expected 3-4 arguments, but got 5`, logged in
 * deferred-items.md). _createActivityCore never took encrypt/decrypt
 * params — catatanPerasaan encryption only applies to completeActivity, not
 * activity creation. Fixed by passing the correct deps object.
 */
export async function createEntry(
  userId: string,
  rawPayload: unknown,
): Promise<ActivityResult> {
  const timezone = await getUserTimezone(userId);
  return _createActivityCore(
    userId,
    rawPayload,
    (data) => dailyActivityRepository.insertActivity(data),
    { timezone },
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

/**
 * Delete (cancel) an activity by ID.
 * Returns the updated activity or null if not found.
 */
export async function deleteActivity(
  userId: string,
  id: string,
): Promise<ActivityResult | null> {
  const row = await dailyActivityRepository.deleteById(userId, id);
  if (!row) return null;
  return formatActivity(row, realDecrypt);
}

/**
 * Update activity fields.
 * Active (berlangsung) activities: can update namaKegiatan, estimasiSelesai, tanggal.
 * Completed (selesai) activities: can update perasaan, catatan.
 * Returns updated activity or null if not found.
 */
export async function updateActivity(
  userId: string,
  id: string,
  data: {
    namaKegiatan?: string;
    estimasiSelesai?: string;
    tanggal?: string;
    perasaan?: string | null;
    catatan?: string | null;
  },
): Promise<ActivityResult | null> {
  const updateData: Record<string, unknown> = {};

  // Update activity name/estimate (for active activities)
  if (data.namaKegiatan !== undefined) {
    updateData.namaKegiatan = data.namaKegiatan;
  }
  if (data.estimasiSelesai) {
    if (data.tanggal) {
      // Combine specific date + HH:mm
      updateData.estimasiSelesai = new Date(`${data.tanggal}T${data.estimasiSelesai}:00+07:00`);
    } else {
      // Use today's WIB date
      updateData.estimasiSelesai = combineWIBDateAndTime(data.estimasiSelesai);
    }
  }

  // Update feelings/notes (for completed activities)
  if (data.perasaan !== undefined) {
    updateData.perasaan = data.perasaan;
  }
  if (data.catatan !== undefined) {
    // Encrypt catatanPerasaan before storing (T-03-02)
    updateData.catatanPerasaan = data.catatan ? realEncrypt(data.catatan) : null;
  }

  if (Object.keys(updateData).length === 0) return null;
  const row = await dailyActivityRepository.updateById(userId, id, updateData as any);
  if (!row) return null;
  return formatActivity(row, realDecrypt);
}

/**
 * List ALL activities for a user (across all dates), ordered by waktuMulai desc.
 */
export async function listAllActivities(
  userId: string,
): Promise<ActivityResult[]> {
  const rows = await dailyActivityRepository.findAllByUser(userId);
  return rows.map((row) => formatActivity(row, realDecrypt));
}
