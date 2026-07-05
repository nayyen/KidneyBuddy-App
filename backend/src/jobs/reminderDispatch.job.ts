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
  findDueRemindersForTimezone,
  markDispatched,
  type ReminderSchedule,
} from "../repositories/reminderSchedule.repository.js";
import { findDistinctActiveTimezones } from "../repositories/user.repository.js";
import { sendToAllDevices, type NotificationPayload } from "../services/notification.service.js";
import {
  wibDateFromHHmm,
  wibDayNameLower,
  wibHHmm,
  localDateFromHHmm,
  localDayNameLower,
  localHHmm,
} from "../utils/wib.js";
import { jenisEmoji, jenisLabel } from "../lib/reminderNotificationCopy.js";

const logger = pino({ name: "reminderDispatch.job" });

export type DispatchDeps = {
  findDue: (time: string, day: string) => Promise<ReminderSchedule[]>;
  insertMedLog: (data: Parameters<typeof insertMedLog>[0]) => Promise<unknown>;
  insertDialysisLog: (data: Parameters<typeof insertDialysisLog>[0]) => Promise<unknown>;
  sendToAll: (userId: string, payload: NotificationPayload) => Promise<void>;
  markDispatched: (id: string) => Promise<void>;
  /**
   * IANA timezone used to compute waktuPengingat for newly inserted log rows.
   * Omitted (undefined) preserves the original WIB-hardcoded behavior for
   * existing callers/tests; dispatchDueReminders() always supplies the
   * per-timezone-group zone it is currently processing (task 2).
   */
  timezone?: string;
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
          waktuPengingat: deps.timezone
            ? localDateFromHHmm(deps.timezone, reminder.jamPengingat)
            : wibDateFromHHmm(reminder.jamPengingat),
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

      // 2. Construct one grouped notification — jenis-aware emoji + label
      //    (quick-260705-9n4 polish request) so a patient can tell at a
      //    glance whether a push is about medication or a dialysis session
      //    without opening the app.
      let title: string;
      let body: string;

      if (reminders.length === 1) {
        const r = reminders[0];
        title = `${jenisEmoji(r.jenis)} Pengingat ${jenisLabel(r.jenis)}: ${r.nama}`;
        body = r.dosis
          ? `${r.dosis} — ketuk untuk konfirmasi`
          : "Ketuk untuk konfirmasi";
      } else {
        const distinctJenis = new Set(reminders.map((r) => r.jenis));
        if (distinctJenis.size === 1) {
          // Whole batch shares the same jenis — use its emoji/label in the title.
          const jenis = reminders[0].jenis;
          const names = reminders.map((r) => r.nama).join(", ");
          title = `${jenisEmoji(jenis)} ${reminders.length} Pengingat ${jenisLabel(jenis)}`;
          body = `Saatnya untuk: ${names}. Ketuk untuk konfirmasi.`;
        } else {
          // Mixed jenis in the same time slot — group the body by jenis,
          // each with its own emoji, so the distinction isn't lost.
          title = `🔔 Beberapa Pengingat untuk jam ${time}`;
          const byJenis = new Map<string, string[]>();
          for (const r of reminders) {
            if (!byJenis.has(r.jenis)) byJenis.set(r.jenis, []);
            byJenis.get(r.jenis)!.push(r.nama);
          }
          body =
            Array.from(byJenis.entries())
              .map(([jenis, names]) => `${jenisEmoji(jenis)} ${jenisLabel(jenis)}: ${names.join(", ")}`)
              .join(" · ") + ". Ketuk untuk konfirmasi.";
        }
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

/**
 * dispatchDueReminders — runs one _dispatchCore pass PER DISTINCT USER
 * TIMEZONE currently in use (quick-260705-9n4 task 2), rather than a single
 * global WIB pass. Chosen over the alternative (join+compare inline per
 * reminder row in one query) because it keeps _dispatchCore's simple
 * (time, day) findDue contract intact — lower risk, no change to the
 * existing reminderDispatch.test.ts DispatchDeps shape. Each pass computes
 * "now" in that zone and only matches reminders owned by users on that zone.
 */
export async function dispatchDueReminders(): Promise<void> {
  const timezones = await findDistinctActiveTimezones();

  // Fallback: no users yet (or all rows somehow null) — preserve original
  // WIB-only behavior rather than silently dispatching nothing.
  if (timezones.length === 0) {
    return _dispatchCore(wibHHmm(), wibDayNameLower(), {
      findDue: findDueReminders,
      insertMedLog,
      insertDialysisLog,
      sendToAll: sendToAllDevices,
      markDispatched,
    });
  }

  for (const timezone of timezones) {
    await _dispatchCore(localHHmm(timezone), localDayNameLower(timezone), {
      findDue: (time, day) => findDueRemindersForTimezone(time, day, timezone),
      insertMedLog,
      insertDialysisLog,
      sendToAll: sendToAllDevices,
      markDispatched,
      timezone,
    });
  }
}
