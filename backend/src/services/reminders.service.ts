/**
 * reminders.service.ts — Reminder + medication-log business logic
 *
 * Implements REMIND-01 (medication reminder), REMIND-05 (CAPD exchange reminder),
 * REMIND-06 (HD dialysis reminder), and REMIND-03 (confirm dose).
 *
 * Follows the injectable core pattern from fluid.service.ts so unit tests can
 * run without a live Postgres connection.
 */
import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";
import * as reminderScheduleRepository from "../repositories/reminderSchedule.repository.js";
import type { NewReminderSchedule, NextUpcomingGrouped } from "../repositories/reminderSchedule.repository.js";
import * as medicationLogRepository from "../repositories/medicationLog.repository.js";
import { wibDateFromHHmm, wibDayNameLower, wibHHmm } from "../utils/wib.js";

// ─── Shared base validation ────────────────────────────────────────────────

// multer sends a single value as a plain string (not array) when only one item is appended.
// z.preprocess coerces it to array so z.array().min(1) validates correctly.
const hariAktifSchema = z.preprocess(
  (val) =>
    Array.isArray(val) ? val : val != null && val !== "" ? [val] : [],
  z.array(z.string()).min(1, "Pilih minimal satu hari aktif"),
);

const jamPengingatSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Format jam pengingat tidak valid (HH:mm)");

// ─── Per-jenis schemas ─────────────────────────────────────────────────────

/**
 * Schema for medication (obat) reminders — REMIND-01
 */
export const createObatSchema = z.object({
  jenis: z.literal("obat").default("obat"),
  nama: z.string().min(1, "Nama obat wajib diisi"),
  dosis: z.string().min(1, "Dosis wajib diisi"),
  jenisObat: z.enum(["minum", "suntik"], {
    errorMap: () => ({ message: "Jenis obat harus 'minum' atau 'suntik'" }),
  }),
  hariAktif: hariAktifSchema,
  jamPengingat: jamPengingatSchema,
  catatanWaktu: z.string().optional().nullable(),
  fotoObat: z.string().optional().nullable(),
});

export type CreateObatPayload = z.infer<typeof createObatSchema>;

/**
 * Schema for CAPD exchange reminders — REMIND-05
 */
export const createCapdSchema = z.object({
  jenis: z.literal("capd").default("capd"),
  nama: z.string().min(1, "Nama pengingat wajib diisi"),
  konsentrasiCapd: z.string().min(1, "Konsentrasi CAPD wajib diisi"),
  jamPengingat: jamPengingatSchema,
  hariAktif: hariAktifSchema,
  catatanWaktu: z.string().optional().nullable(),
});

export type CreateCapdPayload = z.infer<typeof createCapdSchema>;

/**
 * Schema for HD dialysis schedule reminders — REMIND-06
 */
export const createHdSchema = z.object({
  jenis: z.literal("hd").default("hd"),
  nama: z.string().min(1, "Nama pengingat wajib diisi"),
  jamPengingat: jamPengingatSchema,
  hariAktif: hariAktifSchema,
  catatanWaktu: z.string().optional().nullable(),
});

export type CreateHdPayload = z.infer<typeof createHdSchema>;

// ─── Injectable core (for unit tests) ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InsertFn = (data: any) => Promise<any>;
type FindReminderByIdFn = (id: string) => Promise<{ id: string; userId: string; nama: string; dosis?: string | null; jenisObat?: string | null; jamPengingat?: string | null } | undefined>;
type FindLogByReminderUserFn = (reminderId: string, userId: string) => Promise<{ id: string; status: string } | undefined>;
type MarkConfirmedFn = (id: string) => Promise<void>;
type InsertLogFn = (data: any) => Promise<any>;

/**
 * _createReminderCore — injectable for unit tests (no live DB needed)
 */
export async function _createReminderCore(
  data: {
    userId: string;
    jenis: string;
    nama: string;
    dosis?: string | null;
    jenisObat?: string | null;
    fotoObat?: string | null;
    konsentrasiCapd?: string | null;
    hariAktif: unknown[];
    jamPengingat: string;
    catatanWaktu?: string | null;
  },
  insertFn: InsertFn,
): Promise<any> {
  return insertFn({
    userId: data.userId,
    jenis: data.jenis,
    nama: data.nama,
    jamPengingat: data.jamPengingat,
    hariAktif: data.hariAktif,
    catatanWaktu: data.catatanWaktu ?? null,
    dosis: data.dosis ?? null,
    jenisObat: data.jenisObat ?? null,
    fotoObat: data.fotoObat ?? null,
    konsentrasiCapd: data.konsentrasiCapd ?? null,
  });
}

/**
 * _confirmCore — injectable for unit tests
 * Validates ownership, then marks the medication log as dikonfirmasi.
 * Creates a new log row if none exists (user confirmed directly without a push).
 */
export async function _confirmCore(
  userId: string,
  reminderId: string,
  findReminderById: FindReminderByIdFn,
  findLogByReminderUser: FindLogByReminderUserFn,
  markConfirmedFn: MarkConfirmedFn,
  insertLogFn: InsertLogFn,
): Promise<{ confirmed: boolean; logId: string }> {
  // T-02-05-02: validate reminder belongs to this user
  const reminder = await findReminderById(reminderId);
  if (!reminder || reminder.userId !== userId) {
    throw new AppError(
      403,
      "REMINDER_NOT_FOUND",
      "Pengingat tidak ditemukan atau Anda tidak memiliki izin",
    );
  }

  // Check for existing pending log row
  const existingLog = await findLogByReminderUser(reminderId, userId);

  if (existingLog) {
    // Update existing row to dikonfirmasi
    await markConfirmedFn(existingLog.id);
    return { confirmed: true, logId: existingLog.id };
  }

  // Create a new row (confirmed directly)
  const newLog = await insertLogFn({
    userId,
    reminderId,
    namaObat: reminder.nama,
    dosis: reminder.dosis ?? null,
    jenisObat: reminder.jenisObat ?? null,
    status: "dikonfirmasi",
      // FIX: store the reminder's scheduled time (not the current wall-clock)
      // so the displayed time matches the reminder's jamPengingat and doesn't
      // drift with the system clock. Falls back to WIB now if no schedule.
      waktuPengingat: reminder.jamPengingat
        ? wibDateFromHHmm(reminder.jamPengingat)
        : new Date(),
      waktuKonfirmasi: new Date(),
  });

  return { confirmed: true, logId: newLog.id };
}

// ─── Service functions (use real repository) ──────────────────────────────────

export type CreateReminderPayload =
  | ({ jenis: "obat" } & Omit<CreateObatPayload, "jenis">)
  | ({ jenis: "capd" } & Omit<CreateCapdPayload, "jenis">)
  | ({ jenis: "hd" } & Omit<CreateHdPayload, "jenis">);

/**
 * createReminder — validates per-jenis and inserts into DB.
 * Accepts optional fotoObat path (set by multer middleware before service call).
 */
export async function createReminder(
  userId: string,
  payload: CreateReminderPayload & { fotoObat?: string | null },
): Promise<reminderScheduleRepository.ReminderSchedule> {
  const { jenis } = payload;

  let parsedData: any;
  if (jenis === "obat") {
    parsedData = createObatSchema.parse({ ...payload, jenis: "obat" });
  } else if (jenis === "capd") {
    parsedData = createCapdSchema.parse({ ...payload, jenis: "capd" });
  } else if (jenis === "hd") {
    parsedData = createHdSchema.parse({ ...payload, jenis: "hd" });
  } else {
    throw new AppError(400, "INVALID_JENIS", "Jenis pengingat tidak valid");
  }

  return _createReminderCore(
    {
      userId,
      ...parsedData,
      fotoObat: payload.fotoObat ?? null,
    },
    reminderScheduleRepository.insert,
  );
}

export async function listReminders(
  userId: string,
): Promise<reminderScheduleRepository.ReminderSchedule[]> {
  return reminderScheduleRepository.listByUser(userId);
}

export async function updateReminder(
  userId: string,
  reminderId: string,
  data: Partial<{
    nama: string;
    dosis: string;
    jenisObat: string;
    fotoObat: string;
    konsentrasiCapd: string;
    jamPengingat: string;
    hariAktif: string[];
    catatanWaktu: string;
    aktif: boolean;
  }>,
): Promise<reminderScheduleRepository.ReminderSchedule> {
  // Enforce hariAktif non-empty if provided (mirrors create schema .min(1))
  if (
    data.hariAktif !== undefined &&
    (!Array.isArray(data.hariAktif) || data.hariAktif.length === 0)
  ) {
    throw new AppError(
      400,
      "INVALID_HARI_AKTIF",
      "Pilih minimal satu hari aktif",
    );
  }
  const updated = await reminderScheduleRepository.update(reminderId, userId, data);
  if (!updated) {
    throw new AppError(404, "REMINDER_NOT_FOUND", "Pengingat tidak ditemukan");
  }
  return updated;
}

export async function removeReminder(
  userId: string,
  reminderId: string,
): Promise<void> {
  const deleted = await reminderScheduleRepository.remove(reminderId, userId);
  if (!deleted) {
    throw new AppError(404, "REMINDER_NOT_FOUND", "Pengingat tidak ditemukan");
  }
}

export async function getNextUpcoming(
  userId: string,
): Promise<NextUpcomingGrouped> {
  return reminderScheduleRepository.findNextUpcoming(userId);
}
