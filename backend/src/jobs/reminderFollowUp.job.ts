/**
 * reminderFollowUp.job.ts — REMIND-04: single 30-min follow-up for unconfirmed doses
 *
 * Finds medication_log rows still in "tertunda" status older than 30 minutes
 * whose reminder has follow_up_sent=false, sends exactly one follow-up push,
 * and sets follow_up_sent=true so no second follow-up is ever sent.
 */
import pino from "pino";
import {
  findUnconfirmedOlderThan,
} from "../repositories/medicationLog.repository.js";
import {
  findById,
  markFollowUpSent,
} from "../repositories/reminderSchedule.repository.js";
import { sendToAllDevices } from "../services/notification.service.js";
import {
  jenisEmoji,
  jenisLabel,
  jenisFollowUpNoun,
} from "../lib/reminderNotificationCopy.js";

const logger = pino({ name: "reminderFollowUp.job" });

export async function sendFollowUpReminders(): Promise<void> {
  const unconfirmed = await findUnconfirmedOlderThan(30);
  if (unconfirmed.length === 0) return;

  logger.info({ count: unconfirmed.length }, "checking follow-up candidates");

  for (const log of unconfirmed) {
    try {
      const reminder = await findById(log.reminderId);
      if (!reminder) continue;

      // follow_up_sent guard: send at most one follow-up per dispatch cycle
      if (reminder.followUpSent) continue;

      await sendToAllDevices(reminder.userId, {
        title: `${jenisEmoji(reminder.jenis)} Pengingat ${jenisLabel(reminder.jenis)} Terlewat: ${reminder.nama}`,
        body: `Kamu belum mengonfirmasi ${jenisFollowUpNoun(reminder.jenis)} — ketuk untuk konfirmasi sekarang.`,
        reminderId: reminder.id,
        url: "/pengingat",
      });

      await markFollowUpSent(reminder.id);
      logger.info({ reminderId: reminder.id }, "follow-up sent");
    } catch (err) {
      logger.error({ logId: log.id, err }, "failed to send follow-up — skipping");
    }
  }
}
