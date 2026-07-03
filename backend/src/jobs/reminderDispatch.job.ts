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
import { insert as insertMedLog } from "../repositories/medicationLog.repository.js";
import { insert as insertDialysisLog } from "../repositories/dialysisLog.repository.js";
import {
  findDueReminders,
  markDispatched,
  type ReminderSchedule,
} from "../repositories/reminderSchedule.repository.js";
import { sendToAllDevices, type NotificationPayload } from "../services/notification.service.js";
import { wibDateFromHHmm, wibDayNameLower, wibHHmm } from "../utils/wib.js";

const logger = pino({ name: "reminderDispatch.job" });

export type DispatchDeps = {
  findDue: (time: string, day: string) => Promise<ReminderSchedule[]>;
  insertMedLog: (data: Parameters<typeof insertMedLog>[0]) => Promise<unknown>;
  insertDialysisLog: (data: Parameters<typeof insertDialysisLog>[0]) => Promise<unknown>;
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

  // Group reminders by user
  const byUser = new Map<string, ReminderSchedule[]>();
  for (const r of due) {
    if (!byUser.has(r.userId)) byUser.set(r.userId, []);
    byUser.get(r.userId)!.push(r);
  }

  // Process each user's batch
  for (const [userId, reminders] of byUser.entries()) {
    try {
      // 1. Create log entries for all reminders in this batch
      for (const reminder of reminders) {
        const logPayload = {
          userId: reminder.userId,
          reminderId: reminder.id,
          nama: reminder.nama,
          status: "tertunda" as const,
          waktuPengingat: wibDateFromHHmm(reminder.jamPengingat),
        };

        if (reminder.jenis === 'obat') {
          await deps.insertMedLog({
            ...logPayload,
            namaObat: reminder.nama,
            dosis: reminder.dosis ?? undefined,
            jenisObat: reminder.jenisObat ?? undefined,
          });
        } else { // capd or hd
          await deps.insertDialysisLog({
            ...logPayload,
            jenis: reminder.jenis,
            konsentrasiCapd: reminder.konsentrasiCapd ?? null,
          });
        }
      }

      // 2. Construct one grouped notification
      let title: string;
      let body: string;

      if (reminders.length === 1) {
        const r = reminders[0];
        title = `Pengingat: ${r.nama}`;
        body = r.dosis
          ? `${r.dosis} — ketuk untuk konfirmasi`
          : "Ketuk untuk konfirmasi";
      } else {
        title = `Beberapa pengingat untuk jam ${time}`;
        const names = reminders.map(r => r.nama).join(", ");
        body = `Saatnya untuk: ${names}. Ketuk untuk konfirmasi.`;
      }
      
      // 3. Send the single push
      await deps.sendToAll(userId, {
        title,
        body,
        // We can't link to a specific reminder anymore, so link to the general page
        url: "/catatan", 
      });

      // 4. Mark all as dispatched
      for (const reminder of reminders) {
        await deps.markDispatched(reminder.id);
      }
      logger.info({ userId, count: reminders.length }, "user batch dispatched");
    } catch (err) {
      logger.error({ userId, err }, "failed to dispatch user batch — skipping");
    }
  }
}

export async function dispatchDueReminders(): Promise<void> {
  // FIX: Use lowercase day name to match what's stored in `hariAktif`
  return _dispatchCore(wibHHmm(), wibDayNameLower(), {
    findDue: findDueReminders,
    insertMedLog,
    insertDialysisLog,
    sendToAll: sendToAllDevices,
    markDispatched,
  });
}
