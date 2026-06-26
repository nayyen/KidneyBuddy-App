import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";
import * as userRepository from "../repositories/user.repository.js";
import * as onboardingProgressRepository from "../repositories/onboardingProgress.repository.js";
import * as reminderScheduleRepository from "../repositories/reminderSchedule.repository.js";
import { therapyList } from "../config/therapyContent.js";

// ─── Schemas ───────────────────────────────────────────────────────────

const therapyEnum = z.enum(["CAPD", "HD", "Transplantasi"]);

export const therapySchema = z.object({
  therapy: therapyEnum,
});

export const reminderSchema = z.object({
  jenis: z.enum(["obat", "capd", "hd"]),
  nama: z.string().min(1, "Nama pengingat wajib diisi"),
  jamPengingat: z.string().min(1, "Jam pengingat wajib diisi"),
  catatanWaktu: z.string().nullable().optional(),
});

// ─── Save Therapy Method ───────────────────────────────────────────────

export async function saveTherapyMethod(userId: string, therapy: string) {
  const { therapy: validated } = therapySchema.parse({ therapy });

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Build initial riwayatTerapi entry
  const riwayatEntry = {
    metode: validated,
    tanggalMulai: today,
    tanggalDipilih: today,
  };

  await userRepository.updateTherapyMethod(userId, validated, today, [riwayatEntry]);

  // Update progress to step 1 (therapy selected)
  await onboardingProgressRepository.upsertProgress({
    userId,
    lastCompletedStep: 1,
  });

  return { metodeTerapiAktif: validated, tanggalMulaiTerapi: today };
}

// ─── Save First Reminder ───────────────────────────────────────────────

export async function saveFirstReminder(
  userId: string,
  data: { jenis: string; nama: string; jamPengingat: string; catatanWaktu?: string | null },
) {
  const validated = reminderSchema.parse(data);

  await reminderScheduleRepository.insert({
    userId,
    jenis: validated.jenis,
    nama: validated.nama,
    jamPengingat: validated.jamPengingat,
    catatanWaktu: validated.catatanWaktu ?? null,
  });

  // Mark onboarding complete
  await onboardingProgressRepository.upsertProgress({
    userId,
    lastCompletedStep: 2,
    reminderConfigured: true,
    completedAt: new Date(),
  });

  return { message: "Pengingat berhasil disimpan" };
}

// ─── Skip First Reminder ───────────────────────────────────────────────

export async function skipFirstReminder(userId: string) {
  await onboardingProgressRepository.upsertProgress({
    userId,
    lastCompletedStep: 2,
    reminderConfigured: false,
    completedAt: new Date(),
  });

  return { message: "Pengingat dilewati" };
}

// ─── Get Progress ──────────────────────────────────────────────────────

export async function getProgress(userId: string) {
  const progress = await onboardingProgressRepository.findByUserId(userId);

  if (!progress) {
    return {
      onboardingComplete: false,
      lastCompletedStep: 0,
      reminderConfigured: false,
    };
  }

  return {
    onboardingComplete: progress.completedAt !== null,
    lastCompletedStep: progress.lastCompletedStep,
    reminderConfigured: progress.reminderConfigured ?? false,
  };
}

// ─── Get Therapy Content ───────────────────────────────────────────────

export function getTherapyContent() {
  return therapyList;
}
