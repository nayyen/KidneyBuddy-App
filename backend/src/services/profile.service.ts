import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";
import * as userRepository from "../repositories/user.repository.js";
import * as therapyHistoryRepository from "../repositories/therapyHistory.repository.js";

// ─── Schemas ───────────────────────────────────────────────────────────

const therapyEnum = z.enum(["CAPD", "HD", "Transplantasi"]);

export const changeTherapySchema = z.object({
  newMethod: therapyEnum,
  confirmed: z.literal(true, {
    errorMap: () => ({ message: "Konfirmasi diperlukan untuk mengubah metode terapi" }),
  }),
});

// ─── Change Therapy Method ─────────────────────────────────────────────

export async function changeTherapyMethod(
  userId: string,
  newMethod: string,
  confirmed: boolean,
) {
  // Validate input
  const parsed = changeTherapySchema.parse({ newMethod, confirmed });

  // Read current user data
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "Pengguna tidak ditemukan");
  }

  const currentMethod = user.metodeTerapiAktif;

  // No-op if same method
  if (currentMethod === parsed.newMethod) {
    return {
      changed: false,
      message: "Metode terapi sudah sama, tidak ada perubahan",
      metodeTerapiAktif: currentMethod,
    };
  }

  // Build new riwayatTerapi entry
  const today = new Date().toISOString().split("T")[0];
  const riwayatEntry = {
    metode: parsed.newMethod,
    tanggalMulai: today,
    tanggalDipilih: today,
  };
  const existingRiwayat = Array.isArray(user.riwayatTerapi) ? user.riwayatTerapi : [];
  const updatedRiwayat = [...existingRiwayat, riwayatEntry];

  // Update user
  await userRepository.updateTherapyMethod(
    userId,
    parsed.newMethod,
    today,
    updatedRiwayat,
  );

  // Record therapy history
  await therapyHistoryRepository.append(
    userId,
    currentMethod ?? null,
    parsed.newMethod,
  );

  // REMIND-07 (quick-260705-q7w): therapy scoping of cuci-darah reminders is
  // now a NON-DESTRUCTIVE, query-time filter (see therapyReminderScope.ts),
  // driven by comparing the user's metodeTerapiAktif (just updated above)
  // against each reminder's jenis. We intentionally do NOT mutate any
  // reminder_schedule row here anymore — the old destructive
  // `aktif = false` deactivation made switching back to a prior therapy
  // indistinguishable from the user manually disabling a reminder, and
  // permanently lost the ability to restore it. Reminders for every
  // therapy the user has ever used remain stored untouched; only their
  // VISIBILITY (in list/next-upcoming/today-logs/push-dispatch) changes
  // based on the currently active therapy.

  return {
    changed: true,
    message: "Metode terapi berhasil diubah",
    metodeTerapiAktif: parsed.newMethod,
    tanggalMulaiTerapi: today,
  };
}

// ─── Get Therapy History ───────────────────────────────────────────────

export async function getTherapyHistory(userId: string) {
  const history = await therapyHistoryRepository.findByUser(userId);
  return history;
}

// ─── Update Timezone (quick-260705-9n4 task 2) ─────────────────────────

export const updateTimezoneSchema = z.object({
  timezone: z.string().min(1, "Timezone wajib diisi"),
});

/**
 * isValidIanaTimezone — reject malformed client input before it reaches the
 * DB. `Intl.DateTimeFormat` throws a RangeError for any string that is not a
 * recognized IANA timezone name.
 */
function isValidIanaTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export async function updateTimezone(userId: string, timezone: string) {
  const parsed = updateTimezoneSchema.parse({ timezone });

  if (!isValidIanaTimezone(parsed.timezone)) {
    throw new AppError(
      400,
      "INVALID_TIMEZONE",
      "Zona waktu tidak valid",
    );
  }

  await userRepository.updateTimezone(userId, parsed.timezone);

  return { updated: true, timezone: parsed.timezone };
}
