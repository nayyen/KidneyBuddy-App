import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";
import * as userRepository from "../repositories/user.repository.js";
import * as therapyHistoryRepository from "../repositories/therapyHistory.repository.js";
import * as reminderScheduleRepository from "../repositories/reminderSchedule.repository.js";

// ─── Schemas ───────────────────────────────────────────────────────────

const therapyEnum = z.enum(["CAPD", "HD", "Transplantasi"]);

export const changeTherapySchema = z.object({
  newMethod: therapyEnum,
  confirmed: z.literal(true, {
    errorMap: () => ({ message: "Konfirmasi diperlukan untuk mengubah metode terapi" }),
  }),
});

// ─── Therapy-change reminder hook (injectable for tests) ──────────────

type DeactivateFn = (userId: string, jenisToDeactivate: string) => Promise<void>;

/**
 * _changeTherapyWithReminderHookCore — injectable core for REMIND-07 tests.
 *
 * When a user changes therapy method:
 * - CAPD → HD: deactivate jenis='capd' reminders, leave 'obat' and 'hd' untouched
 * - HD → CAPD: deactivate jenis='hd' reminders, leave 'obat' and 'capd' untouched
 * - Same method → no-op (oldMethod === newMethod)
 * - To 'Transplantasi' → no therapy-specific reminders to deactivate
 */
export async function _changeTherapyWithReminderHookCore(
  userId: string,
  oldMethod: string | null | undefined,
  newMethod: string,
  deactivateFn: DeactivateFn,
): Promise<void> {
  if (!oldMethod || oldMethod === newMethod) {
    // No-op: no previous method or same method
    return;
  }

  // Deactivate the OLD therapy-specific jenis
  // e.g. CAPD→HD: deactivate jenis='capd'
  // e.g. HD→CAPD: deactivate jenis='hd'
  const oldJenis = oldMethod.toLowerCase(); // 'CAPD'→'capd', 'HD'→'hd', 'Transplantasi'→'transplantasi'

  // Only deactivate therapy-specific reminders (capd or hd)
  // 'obat' reminders are NEVER deactivated by therapy change (REMIND-07)
  if (oldJenis === "capd" || oldJenis === "hd") {
    await deactivateFn(userId, oldJenis);
  }
}

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

  // REMIND-07: Deactivate therapy-specific reminders for the OLD method.
  // Medication (obat) reminders are preserved.
  await _changeTherapyWithReminderHookCore(
    userId,
    currentMethod,
    parsed.newMethod,
    reminderScheduleRepository.deactivateTherapySpecific,
  );

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
