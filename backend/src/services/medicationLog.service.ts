/**
 * medicationLog.service.ts — Medication log business logic
 *
 * Implements REMIND-03: confirm a dose taken.
 * Uses the injectable _confirmCore from reminders.service for testability.
 */
import * as reminderScheduleRepository from "../repositories/reminderSchedule.repository.js";
import * as medicationLogRepository from "../repositories/medicationLog.repository.js";
import * as reminderScheduleRepository from "../repositories/reminderSchedule.repository.js";
import type { MedicationLog } from "../repositories/medicationLog.repository.js";
import { _confirmCore } from "./reminders.service.js";

/**
 * confirm — validate reminder ownership and log the confirmation.
 * T-02-05-02: rejects if the reminder does not belong to the calling userId.
 */
export async function confirm(
  userId: string,
  reminderId: string,
): Promise<{ confirmed: boolean; logId: string }> {
  return _confirmCore(
    userId,
    reminderId,
    reminderScheduleRepository.findById,
    medicationLogRepository.findByReminderAndUser,
    medicationLogRepository.markConfirmed,
    medicationLogRepository.insert,
  );
}

/**
 * getTodayUnconfirmed — list today's medication logs that are still 'tertunda'.
 * Used by the D-04 Obat card on the dashboard.
 */
export async function getTodayUnconfirmed(userId: string): Promise<MedicationLog[]> {
  const logs = await medicationLogRepository.findTodayByUser(userId);
  return logs.filter((l) => l.status !== "dikonfirmasi");
}

/**
 * getTodayLogs — list all of today's medication logs (all statuses).
 * Used by GET /api/medication-log/today.
 */
export async function getTodayLogs(userId: string): Promise<MedicationLog[]> {
  // Get existing medication log entries
  const logs = await medicationLogRepository.findTodayByUser(userId);

  // Get today's WIB day name
  const INDONESIAN_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const jakartaNow = new Date(Date.now() + 7 * 3600 * 1000);
  const todayDayName = INDONESIAN_DAYS[jakartaNow.getUTCDay()];
  const todayDayLower = todayDayName.toLowerCase();

  // Get scheduled reminders for today that don't have a log entry yet
  // Use findActiveObatByUser + JS filter instead of raw SQL (avoids jsonb operator issues)
  const allActive = await reminderScheduleRepository.findActiveObatByUser(userId);
  const scheduled = allActive.filter((r) => {
    const hariAktif = (r.hariAktif as string[]) ?? [];
    return hariAktif.includes(todayDayLower);
  });

  // Convert scheduled reminders to MedicationLog-like shape
  const scheduledAsLogs: MedicationLog[] = scheduled.map((r) => ({
    id: `scheduled-${r.id}`,
    userId: r.userId,
    reminderId: r.id,
    namaObat: r.nama,
    dosis: r.dosis,
    jenisObat: r.jenisObat,
    status: "tertunda" as const,
    waktuPengingat: new Date(),
    confirmedAt: null,
  }));

  // Merge: scheduled first (not yet dispatched), then logs (already dispatched or confirmed)
  return [...scheduledAsLogs, ...logs];
}
