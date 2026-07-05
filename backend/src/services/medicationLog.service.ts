/**
 * medicationLog.service.ts — Medication log business logic
 *
 * Implements REMIND-03: confirm a dose taken.
 * Uses the injectable _confirmCore from reminders.service for testability.
 */
import * as reminderScheduleRepository from "../repositories/reminderSchedule.repository.js";
import * as medicationLogRepository from "../repositories/medicationLog.repository.js";
import type { MedicationLog } from "../repositories/medicationLog.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { _confirmCore } from "./reminders.service.js";
import {
  localDateFromHHmm,
  localDayNameLower,
  localDayBounds,
} from "../utils/wib.js";

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
 * confirm — validate reminder ownership and log the confirmation.
 * T-02-05-02: rejects if the reminder does not belong to the calling userId.
 */
export async function confirm(
  userId: string,
  reminderId: string,
): Promise<{ confirmed: boolean; logId: string }> {
  const timezone = await getUserTimezone(userId);
  return _confirmCore(
    userId,
    reminderId,
    reminderScheduleRepository.findById,
    medicationLogRepository.findByReminderAndUser,
    medicationLogRepository.markConfirmed,
    medicationLogRepository.insert,
    timezone,
  );
}

export const SCHEDULED_PREFIX = "scheduled-";

export type ConfirmByIdDeps = {
  markConfirmedById: (logId: string, userId: string) => Promise<void>;
  confirmByReminderId: (
    userId: string,
    reminderId: string,
  ) => Promise<{ confirmed: boolean; logId: string }>;
};

export type UnconfirmByIdDeps = {
  markUnconfirmedById: (logId: string, userId: string) => Promise<void>;
  findByReminderAndUser: (
    reminderId: string,
    userId: string,
  ) => Promise<{ id: string } | undefined>;
};

/**
 * _confirmByIdCore — injectable core for confirmById (testable without a DB).
 *
 * getTodayLogs() emits pseudo-entries with id="scheduled-<reminderId>" for
 * reminders that have no real log row yet. That literal string is never a
 * valid uuid, so a direct markConfirmedById(logId, ...) throws Postgres's
 * "invalid input syntax for type uuid" (500). Detect the prefix and delegate
 * to the reminder-based confirm() path, which creates-or-updates the real row.
 */
export async function _confirmByIdCore(
  userId: string,
  logId: string,
  deps: ConfirmByIdDeps,
): Promise<{ confirmed: boolean; logId: string }> {
  if (logId.startsWith(SCHEDULED_PREFIX)) {
    const reminderId = logId.slice(SCHEDULED_PREFIX.length);
    return deps.confirmByReminderId(userId, reminderId);
  }

  await deps.markConfirmedById(logId, userId);
  return { confirmed: true, logId };
}

/**
 * _unconfirmByIdCore — injectable core for unconfirmById (testable without a DB).
 * Mirrors _confirmByIdCore's scheduled-prefix guard. An unconfirmed scheduled
 * item with no real log row yet is already effectively "tertunda" — no-op.
 */
export async function _unconfirmByIdCore(
  userId: string,
  logId: string,
  deps: UnconfirmByIdDeps,
): Promise<{ confirmed: boolean; logId: string }> {
  if (logId.startsWith(SCHEDULED_PREFIX)) {
    const reminderId = logId.slice(SCHEDULED_PREFIX.length);
    const existingLog = await deps.findByReminderAndUser(reminderId, userId);
    if (existingLog) {
      await deps.markUnconfirmedById(existingLog.id, userId);
    }
    return { confirmed: false, logId };
  }

  await deps.markUnconfirmedById(logId, userId);
  return { confirmed: false, logId };
}

export async function confirmById(
  userId: string,
  logId: string,
): Promise<{ confirmed: boolean; logId: string }> {
  return _confirmByIdCore(userId, logId, {
    markConfirmedById: medicationLogRepository.markConfirmedById,
    confirmByReminderId: confirm,
  });
}

export async function unconfirmById(
  userId: string,
  logId: string,
): Promise<{ confirmed: boolean; logId: string }> {
  return _unconfirmByIdCore(userId, logId, {
    markUnconfirmedById: medicationLogRepository.markUnconfirmedById,
    findByReminderAndUser: medicationLogRepository.findByReminderAndUser,
  });
}

/**
 * getTodayUnconfirmed — list today's medication logs that are still 'tertunda'.
 * Used by the D-04 Obat card on the dashboard.
 */
export async function getTodayUnconfirmed(userId: string): Promise<MedicationLog[]> {
  const timezone = await getUserTimezone(userId);
  const logs = await medicationLogRepository.findTodayByUser(
    userId,
    localDayBounds(timezone),
  );
  return logs.filter((l) => l.status !== "dikonfirmasi");
}

/**
 * getTodayLogs — list all of today's medication logs (all statuses).
 * Used by GET /api/medication-log/today.
 */
export async function getTodayLogs(userId: string): Promise<MedicationLog[]> {
  // 0. Resolve the requesting user's own device timezone (task 2) so "today"
  //    bounds and day-name matching are correct for THAT user, not just WIB.
  const timezone = await getUserTimezone(userId);

  // 1. Get real DB log rows for today (user-timezone-correct bounds)
  const logs = await medicationLogRepository.findTodayByUser(
    userId,
    localDayBounds(timezone),
  );

  // 2. Get today's local day name (lowercase for hariAktif matching)
  const todayDayLower = localDayNameLower(timezone);

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
      waktuPengingat: localDateFromHHmm(timezone, r.jamPengingat),
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


  // 6. B3 (quick-260705-9n4 task 7): a scheduled-but-not-yet-due item should
  //    behave like a reminder — hidden from "Obat Hari Ini" until its
  //    jamPengingat actually arrives, not visible for the whole day. This
  //    ONLY filters pseudo "scheduled-<reminderId>" entries with no real log
  //    row yet; any REAL DB row (dispatched-and-still-tertunda, or already
  //    dikonfirmasi/terlewat) always remains visible regardless of time,
  //    since it represents actual persisted activity, not just an upcoming
  //    schedule slot.
  const now = new Date();
  const merged = Array.from(scheduledMap.values()).filter((log) => {
    const isPendingPseudoEntry = log.id.startsWith(SCHEDULED_PREFIX);
    if (isPendingPseudoEntry && log.waktuPengingat.getTime() > now.getTime()) {
      return false; // not due yet — hide until jamPengingat arrives
    }
    return true;
  });

  merged.sort(
    (a, b) => a.waktuPengingat.getTime() - b.waktuPengingat.getTime(),
  );
  return merged;
}
