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

  // 4. Build a map of existing logs by reminderId for dedup.
  //    CRITICAL FIX: previously scheduled entries always appeared as "tertunda"
  //    even after confirmation, because there was no dedup — the confirmed log
  //    was masked by a re-generated scheduled entry on every reload.
  const logsByReminderId = new Map<string, MedicationLog>();
  for (const log of logs) {
    logsByReminderId.set(log.reminderId, log);
  }

  // 5. For each scheduled reminder: if a log already exists, use the log's
  //    persisted status (dikonfirmasi/tertunda/terlewat). Only create a
  //    "scheduled" pseudo-entry if no log row exists yet.
  const scheduledAsLogs: MedicationLog[] = [];
  for (const r of scheduled) {
    if (logsByReminderId.has(r.id)) {
      // A log row already exists for this reminder today — use its real status.
      continue;
    }
    scheduledAsLogs.push({
      id: `scheduled-${r.id}`,
      userId: r.userId,
      reminderId: r.id,
      namaObat: r.nama,
      dosis: r.dosis,
      jenisObat: r.jenisObat,
      status: "tertunda" as const,
      // FIX: use the reminder's scheduled HH:mm, not the current wall-clock,
      // so the displayed time doesn't drift with the laptop/system clock.
      waktuPengingat: wibDateFromHHmm(r.jamPengingat),
        waktuKonfirmasi: null,
        createdAt: new Date(),
      } as MedicationLog);
  }

  // 6. Merge and sort by waktuPengingat ascending (earliest first).
  const merged = [...logs, ...scheduledAsLogs];
  merged.sort(
    (a, b) => a.waktuPengingat.getTime() - b.waktuPengingat.getTime(),
  );
  return merged;
}
