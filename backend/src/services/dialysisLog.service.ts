/**
 * dialysisLog.service.ts — Cuci Darah (HD/CAPD session) compliance business logic
 *
 * Mirrors medicationLog.service.ts structure. Implements confirm flow and
 * today's log retrieval with dedup + WIB-correct scheduled times.
 */
import * as reminderScheduleRepository from "../repositories/reminderSchedule.repository.js";
import * as dialysisLogRepository from "../repositories/dialysisLog.repository.js";
import type { DialysisLog } from "../repositories/dialysisLog.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { AppError } from "../middleware/errorHandler.js";
import { localDateFromHHmm, localDayNameLower, localDayBounds } from "../utils/wib.js";
import { isReminderVisibleForTherapy } from "../lib/therapyReminderScope.js";

const DEFAULT_TIMEZONE = "Asia/Jakarta";

/**
 * Look up the requesting user's stored IANA timezone (quick-260705-9n4 task
 * 2), falling back to Asia/Jakarta (the pre-existing WIB assumption) if the
 * user row is missing a value for any reason.
 */
async function getUserTimezone(userId: string): Promise<string> {
  const user = await userRepository.findById(userId);
  return user?.timezone || DEFAULT_TIMEZONE;
}

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

  const timezone = await getUserTimezone(userId);
  const newLog = await dialysisLogRepository.insert({
    userId: userId as any,
    reminderId: reminderId as any,
    jenis: reminder.jenis,
    nama: reminder.nama,
    konsentrasiCapd: reminder.konsentrasiCapd ?? null,
    status: "dikonfirmasi",
    waktuPengingat: reminder.jamPengingat
      ? localDateFromHHmm(timezone, reminder.jamPengingat)
      : new Date(),
    waktuKonfirmasi: new Date(),
  } as any);

  return { confirmed: true, logId: newLog.id };
}

const SCHEDULED_PREFIX = "scheduled-";

export async function confirmById(
  userId: string,
  logId: string,
): Promise<{ confirmed: boolean; logId: string }> {
  // getTodayLogs() emits pseudo-entries with id="scheduled-<reminderId>" for
  // reminders that have no real log row yet. That literal string is never a
  // valid uuid, so a direct markConfirmedById(logId, ...) throws Postgres's
  // "invalid input syntax for type uuid" (500). Detect the prefix and delegate
  // to the reminder-based confirm() path, which creates-or-updates the real row.
  if (logId.startsWith(SCHEDULED_PREFIX)) {
    const reminderId = logId.slice(SCHEDULED_PREFIX.length);
    return confirm(userId, reminderId);
  }

  await dialysisLogRepository.markConfirmedById(logId, userId);
  return { confirmed: true, logId: logId };
}

export async function unconfirmById(
  userId: string,
  logId: string,
): Promise<{ confirmed: boolean; logId: string }> {
  // Mirror of confirmById's scheduled-prefix guard. An unconfirmed scheduled
  // item with no real log row yet is already effectively "tertunda" — no-op.
  if (logId.startsWith(SCHEDULED_PREFIX)) {
    const reminderId = logId.slice(SCHEDULED_PREFIX.length);
    const existingLog = await dialysisLogRepository.findByReminderAndUser(
      reminderId,
      userId,
    );
    if (existingLog) {
      await dialysisLogRepository.markUnconfirmedById(existingLog.id, userId);
    }
    return { confirmed: false, logId: logId };
  }

  await dialysisLogRepository.markUnconfirmedById(logId, userId);
  return { confirmed: false, logId: logId };
}

export type DialysisLogWithCatatan = DialysisLog & { catatanWaktu: string | null };

/**
 * getTodayLogs — list all of today's dialysis log entries (all statuses).
 * Merges scheduled cuci darah reminders with existing logs, dedup by reminderId.
 */
export async function getTodayLogs(userId: string): Promise<DialysisLogWithCatatan[]> {
  const user = await userRepository.findById(userId);
  const timezone = user?.timezone || DEFAULT_TIMEZONE;
  const metode = user?.metodeTerapiAktif ?? null;
  const logs = await dialysisLogRepository.findTodayByUser(
    userId,
    localDayBounds(timezone),
  );
  const todayDayLower = localDayNameLower(timezone);

  const allActive = await reminderScheduleRepository.findActiveCuciDarahByUser(
    userId,
  );
  // Therapy-scoped (quick-260705-q7w): only the reminder jenis matching the
  // user's current metodeTerapiAktif is scheduled today. For Transplantasi
  // this yields zero cuci-darah entries — the beranda card / /catatan tab
  // then show nothing to schedule.
  const therapyScoped = allActive.filter((r) => isReminderVisibleForTherapy(r.jenis, metode));
  const scheduled = therapyScoped.filter((r) => {
    const hariAktif = (r.hariAktif as string[]) ?? [];
    return hariAktif.length > 0 && hariAktif.includes(todayDayLower);
  });

  // Task 1 (quick-260706-8zc): dialysis_log has no catatanWaktu column of its
  // own (it lives on reminder_schedule) — build a lookup from ALL of the
  // user's cuci-darah reminders (capd + hd), regardless of aktif, mirroring
  // medicationLog.service.ts's fotoObat/catatanWaktu sourcing decision so a
  // log whose reminder was later disabled still resolves its catatan.
  const allCuciDarahReminders = (
    await reminderScheduleRepository.listByUser(userId)
  ).filter((r) => r.jenis === "capd" || r.jenis === "hd");
  const catatanWaktuByReminderId = new Map<string, string | null>();
  for (const r of allCuciDarahReminders) {
    catatanWaktuByReminderId.set(r.id, r.catatanWaktu ?? null);
  }

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
      waktuPengingat: localDateFromHHmm(timezone, r.jamPengingat),
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

  // B3 (quick-260705-9n4 task 7): mirrors medicationLog.service.ts's
  // getTodayLogs — hide scheduled-but-not-yet-due pseudo entries until their
  // jamPengingat arrives; real DB rows (dispatched-tertunda, dikonfirmasi,
  // terlewat) always remain visible.
  const now = new Date();
  const merged: DialysisLogWithCatatan[] = Array.from(scheduledMap.values())
    .filter((log) => {
      const isPendingPseudoEntry = log.id.startsWith(SCHEDULED_PREFIX);
      if (isPendingPseudoEntry && log.waktuPengingat.getTime() > now.getTime()) {
        return false;
      }
      return true;
    })
    .map((log) => ({
      ...log,
      catatanWaktu: log.reminderId ? catatanWaktuByReminderId.get(log.reminderId) ?? null : null,
    }));

  merged.sort((a, b) => a.waktuPengingat.getTime() - b.waktuPengingat.getTime());
  return merged;
}
