/**
 * dialysisLog.service.ts — Cuci Darah (HD/CAPD session) compliance business logic
 *
 * Mirrors medicationLog.service.ts structure. Implements confirm flow and
 * today's log retrieval with dedup + WIB-correct scheduled times.
 */
import * as reminderScheduleRepository from "../repositories/reminderSchedule.repository.js";
import * as dialysisLogRepository from "../repositories/dialysisLog.repository.js";
import type { DialysisLog } from "../repositories/dialysisLog.repository.js";
import { AppError } from "../middleware/errorHandler.js";
import { wibDateFromHHmm, wibDayNameLower } from "../utils/wib.js";

/**
 * confirm — validate reminder ownership and log the dialysis session confirmation.
 * Rejects if the reminder does not belong to the calling userId.
 */
export async function confirm(
  userId: string,
  reminderId: string,
): Promise<{ confirmed: boolean; logId: string }> {
  const reminder = await reminderScheduleRepository.findById(reminderId);
  if (!reminder || reminder.userId !== userId) {
    throw new AppError(
      403,
      "REMINDER_NOT_FOUND",
      "Pengingat tidak ditemukan atau Anda tidak memiliki izin",
    );
  }

  const existingLog = await dialysisLogRepository.findByReminderAndUser(
    reminderId,
    userId,
  );

  if (existingLog) {
    await dialysisLogRepository.markConfirmed(existingLog.id);
    return { confirmed: true, logId: existingLog.id };
  }

  const newLog = await dialysisLogRepository.insert({
    userId: userId as any,
    reminderId: reminderId as any,
    jenis: reminder.jenis,
    nama: reminder.nama,
    konsentrasiCapd: reminder.konsentrasiCapd ?? null,
    status: "dikonfirmasi",
    waktuPengingat: reminder.jamPengingat
      ? wibDateFromHHmm(reminder.jamPengingat)
      : new Date(),
    waktuKonfirmasi: new Date(),
  } as any);

  return { confirmed: true, logId: newLog.id };
}

export async function confirmById(
  userId: string,
  logId: string,
): Promise<{ confirmed: boolean; logId: string }> {
  await dialysisLogRepository.markConfirmedById(logId, userId);
  return { confirmed: true, logId: logId };
}

export async function unconfirmById(
  userId: string,
  logId: string,
): Promise<{ confirmed: boolean; logId: string }> {
  await dialysisLogRepository.markUnconfirmedById(logId, userId);
  return { confirmed: false, logId: logId };
}

/**
 * getTodayLogs — list all of today's dialysis log entries (all statuses).
 * Merges scheduled cuci darah reminders with existing logs, dedup by reminderId.
 */
export async function getTodayLogs(userId: string): Promise<DialysisLog[]> {
  const logs = await dialysisLogRepository.findTodayByUser(userId);
  const todayDayLower = wibDayNameLower();

  const allActive = await reminderScheduleRepository.findActiveCuciDarahByUser(
    userId,
  );
  const scheduled = allActive.filter((r) => {
    const hariAktif = (r.hariAktif as string[]) ?? [];
    return hariAktif.length > 0 && hariAktif.includes(todayDayLower);
  });

  const scheduledMap = new Map<string, DialysisLog>();
  for (const r of scheduled) {
    scheduledMap.set(r.id, {
      id: `scheduled-${r.id}`,
      userId: r.userId,
      reminderId: r.id,
      jenis: r.jenis,
      nama: r.nama,
      konsentrasiCapd: r.konsentrasiCapd ?? null,
      status: "tertunda" as const,
      waktuPengingat: wibDateFromHHmm(r.jamPengingat),
      waktuKonfirmasi: null,
      createdAt: new Date(),
    } as DialysisLog);
  }

  for (const log of logs) {
    if (log.reminderId && scheduledMap.has(log.reminderId)) {
      scheduledMap.set(log.reminderId, log);
    } else if (!log.reminderId) {
      scheduledMap.set(log.id, log);
    }
  }

  const merged = Array.from(scheduledMap.values());
  merged.sort((a, b) => a.waktuPengingat.getTime() - b.waktuPengingat.getTime());
  return merged;
}
