/**
 * medicationLog.service.ts — Medication log business logic
 *
 * Implements REMIND-03: confirm a dose taken.
 * Uses the injectable _confirmCore from reminders.service for testability.
 */
import * as reminderScheduleRepository from "../repositories/reminderSchedule.repository.js";
import * as medicationLogRepository from "../repositories/medicationLog.repository.js";
import type { MedicationLog } from "../repositories/medicationLog.repository.js";
import { _confirmCore } from "./reminders.service.js";
import { wibDateFromHHmm, wibDayNameLower } from "../utils/wib.js";

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

export async function confirmById(
  userId: string,
  logId: string,
): Promise<{ confirmed: boolean; logId: string }> {
  // Directly update the specific log entry
  await medicationLogRepository.markConfirmedById(logId, userId);
  return { confirmed: true, logId };
}

export async function unconfirmById(
  userId: string,
  logId: string,
): Promise<{ confirmed: boolean; logId: string }> {
  // Directly update the specific log entry
  await medicationLogRepository.markUnconfirmedById(logId, userId);
  return { confirmed: false, logId };
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
  // 1. Get real DB log rows for today (WIB-correct bounds)
  const logs = await medicationLogRepository.findTodayByUser(userId);

  // 2. Get today's WIB day name (lowercase for hariAktif matching)
  const todayDayLower = wibDayNameLower();

  // 3. Get active obat reminders scheduled for today (aktif=true, hariAktif includes today, non-empty)
  const allActive = await reminderScheduleRepository.findActiveObatByUser(userId);
  const scheduled = allActive.filter((r) => {
    const hariAktif = (r.hariAktif as string[]) ?? [];
    return hariAktif.length > 0 && hariAktif.includes(todayDayLower);
  });

  // 4. Create pseudo-entries for all scheduled reminders for today.
  const scheduledMap = new Map<string, MedicationLog>();
  for (const r of scheduled) {
    scheduledMap.set(r.id, {
      id: `scheduled-${r.id}`,
      userId: r.userId,
      reminderId: r.id,
      namaObat: r.nama,
      dosis: r.dosis,
      jenisObat: r.jenisObat,
      status: "tertunda" as const,
      waktuPengingat: wibDateFromHHmm(r.jamPengingat),
      waktuKonfirmasi: null,
      createdAt: new Date(),
    } as MedicationLog);
  }

  // 5. Iterate over the real logs from the DB. If a real log exists for a
  //    scheduled reminder, overwrite the pseudo-entry in the map with the
  //    real log data. This ensures the persisted status (e.g., 'dikonfirmasi') is used.
  for (const log of logs) {
    if (log.reminderId && scheduledMap.has(log.reminderId)) {
      scheduledMap.set(log.reminderId, log);
    } else if (!log.reminderId) {
      // This is an ad-hoc log entry not tied to a schedule, add it to the list.
      // Use its real ID as the key.
      scheduledMap.set(log.id, log);
    }
  }


  // 6. The final merged list is the values from the map, sorted by time.
  const merged = Array.from(scheduledMap.values());
  merged.sort(
    (a, b) => a.waktuPengingat.getTime() - b.waktuPengingat.getTime(),
  );
  return merged;
}
