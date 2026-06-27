/**
 * reminderDispatch.job.ts — REMIND-02: dispatch due reminders every minute
 *
 * Queries Postgres each tick (never an in-memory schedule) so a backend
 * restart does not silently drop reminders. For each due reminder:
 *  1. Insert a medication_log row with status "tertunda"
 *  2. Fan out a push to all of the user's devices (REMIND-08)
 *  3. Set last_notification_sent_at to prevent duplicate fire in the same tick
 *
 * _dispatchCore accepts injected deps for unit testing (Node 20 has no mock.module).
 */
import pino from "pino";
import { insert as insertLog } from "../repositories/medicationLog.repository.js";
import {
  findDueReminders,
  markDispatched,
  type ReminderSchedule,
} from "../repositories/reminderSchedule.repository.js";
import { sendToAllDevices, type NotificationPayload } from "../services/notification.service.js";

const logger = pino({ name: "reminderDispatch.job" });

const INDONESIAN_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function currentHHmm(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function currentDayName(): string {
  return INDONESIAN_DAYS[new Date().getDay()];
}

export type DispatchDeps = {
  findDue: (time: string, day: string) => Promise<ReminderSchedule[]>;
  insertLog: (data: Parameters<typeof insertLog>[0]) => Promise<unknown>;
  sendToAll: (userId: string, payload: NotificationPayload) => Promise<void>;
  markDispatched: (id: string) => Promise<void>;
};

export async function _dispatchCore(
  time: string,
  day: string,
  deps: DispatchDeps,
): Promise<void> {
  const due = await deps.findDue(time, day);
  if (due.length === 0) return;

  logger.info({ count: due.length, time, day }, "dispatching due reminders");

  for (const reminder of due) {
    try {
      await deps.insertLog({
        userId: reminder.userId,
        reminderId: reminder.id,
        namaObat: reminder.nama,
        dosis: reminder.dosis ?? undefined,
        jenisObat: reminder.jenisObat ?? undefined,
        status: "tertunda",
        waktuPengingat: new Date(),
      });

      const body = reminder.dosis
        ? `${reminder.dosis} — ketuk untuk konfirmasi`
        : "Ketuk untuk konfirmasi";

      await deps.sendToAll(reminder.userId, {
        title: `Pengingat: ${reminder.nama}`,
        body,
        reminderId: reminder.id,
        url: "/pengingat",
      });

      await deps.markDispatched(reminder.id);
      logger.info({ reminderId: reminder.id }, "reminder dispatched");
    } catch (err) {
      // Per-reminder errors must not abort the batch (T-02-06-04)
      logger.error({ reminderId: reminder.id, err }, "failed to dispatch reminder — skipping");
    }
  }
}

export async function dispatchDueReminders(): Promise<void> {
  return _dispatchCore(currentHHmm(), currentDayName(), {
    findDue: findDueReminders,
    insertLog,
    sendToAll: sendToAllDevices,
    markDispatched,
  });
}
