/**
 * anomalyOrchestrator.service.ts — rules -> dedup -> explain -> insert -> emergency push
 *
 * The single pipeline shared by BOTH call sites (Pattern 1, RESEARCH.md): the
 * per-entry fire-and-forget trigger in fluid/medicationLog/dialysisLog
 * controllers (ANOMALY-01 "every new tracking entry") and the 21:00 WIB batch
 * job iterating all users. No duplicated rule-firing logic between the two.
 *
 * runAnomalyChecksForUser() never throws to the caller — every step is
 * wrapped in try/catch and logged instead, so a failure for one user/rule
 * never blocks a fire-and-forget caller or the sequential batch loop (D-18).
 */
import pino from "pino";
import { sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { encrypt } from "../lib/encryption.js";
import {
  checkCapdEffluentAnomaly,
  checkFluidIntakeDeviation,
  checkFluidOutputDecline,
  checkMissedSchedules,
  type RuleResult,
} from "./anomalyRule.service.js";
import { getValidatedExplanation } from "./anomalyExplanation.service.js";
import {
  findActiveByType,
  insertAlert,
} from "../repositories/anomalyAlert.repository.js";
import { sendToAllDevices } from "./notification.service.js";
import { findById as findUserById } from "../repositories/user.repository.js";
import {
  getDailyKeluarLast3Days,
  getIntakeVsSevenDayAvg,
  getTodayAbnormalKondisiKeluar,
} from "../repositories/fluidLog.repository.js";
import { findMissedToday as findMissedMedicationToday } from "../repositories/medicationLog.repository.js";
import { findMissedToday as findMissedDialysisToday } from "../repositories/dialysisLog.repository.js";

const logger = pino({ name: "anomalyOrchestrator.service" });

/**
 * Runs all 4 deterministic rules against a user's current tracking data. For
 * each fired rule: dedups against an already-active (aktif/dibaca) alert of
 * the same type (Pitfall 3), generates + D-20-validates the explanation,
 * encrypts it (lib/encryption.ts, same convention as fluid_log.catatan),
 * inserts the alert with severity fixed by type (D-02), and — for severity
 * "tinggi" only — fans out an emergency push to every one of the user's
 * devices (D-06/D-08).
 */
export async function runAnomalyChecksForUser(userId: string): Promise<void> {
  try {
    const [user, dailyKeluar, intakeHistory, kondisiKeluarToday, missedMed, missedDialysis] =
      await Promise.all([
        findUserById(userId),
        getDailyKeluarLast3Days(userId),
        getIntakeVsSevenDayAvg(userId),
        getTodayAbnormalKondisiKeluar(userId),
        findMissedMedicationToday(userId),
        findMissedDialysisToday(userId),
      ]);

    const tipePasien = user?.metodeTerapiAktif ?? "unknown";
    const missedCountToday = missedMed + missedDialysis;

    const fired: Array<RuleResult | null> = [
      checkFluidOutputDecline(dailyKeluar),
      checkCapdEffluentAnomaly(kondisiKeluarToday),
      checkMissedSchedules(missedCountToday),
      checkFluidIntakeDeviation(intakeHistory),
    ];

    for (const rule of fired) {
      if (!rule) continue; // D-04 silent-skip / threshold not met
      await processFiredRule(userId, tipePasien, rule);
    }
  } catch (err) {
    logger.error(
      { userId, err },
      "anomaly check failed for user — swallowed (fire-and-forget/batch safe)",
    );
  }
}

/**
 * Dedup -> explain -> encrypt -> insert -> conditional emergency push for a
 * single fired rule. Isolated in its own try/catch so one rule's failure
 * (e.g. a Groq timeout) doesn't prevent the other 3 rules from being
 * evaluated for the same user.
 *
 * The dedup-check + explain + insert sequence runs inside a single DB
 * transaction guarded by a `pg_advisory_xact_lock` keyed to
 * `(userId, tipeAnomali)` (code review WR-03, 2026-07-04): without this,
 * two near-simultaneous fire-and-forget calls for the same user+type
 * (e.g. two rapid tracking entries, or a client retry) could both pass the
 * `findActiveByType` check before either had inserted, producing duplicate
 * alert rows and — for severity "tinggi" — duplicate emergency push
 * notifications for what the patient experiences as one event. The
 * advisory lock serializes concurrent calls for the SAME user+type only;
 * unrelated users/types are unaffected. The emergency push itself stays
 * OUTSIDE the transaction (a push failure must never roll back an already-
 * committed alert).
 */
async function processFiredRule(
  userId: string,
  tipePasien: string,
  rule: RuleResult,
): Promise<void> {
  try {
    let explanationText = "";
    let inserted = false;

    await db.transaction(async (tx) => {
      // hashtextextended folds both strings into one 64-bit advisory-lock
      // key; released automatically at transaction end (commit or rollback).
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ":" + rule.tipeAnomali}, 0))`,
      );

      // Pitfall 3 dedup: don't re-fire while an unresolved alert of this
      // type already exists today (aktif/dibaca, not yet ditindaklanjuti).
      const active = await findActiveByType(userId, rule.tipeAnomali, tx);
      if (active.length > 0) return;

      const { text, isFallback } = await getValidatedExplanation(rule);
      explanationText = text;
      const encryptedDeskripsi = encrypt(text);

      await insertAlert(
        userId,
        {
          tipeAnomali: rule.tipeAnomali,
          severity: rule.severity,
          confidenceScore: rule.confidenceScore,
          deskripsi: encryptedDeskripsi,
          tipePasien,
          ruleData: rule.ruleData,
          isFallback,
        },
        tx,
      );
      inserted = true;
    });

    if (!inserted) return; // deduped within the lock — nothing more to do

    if (rule.severity === "tinggi") {
      await sendToAllDevices(userId, {
        title: "Peringatan Kesehatan Darurat",
        body: explanationText,
        url: "/beranda",
      }).catch((err) =>
        logger.error(
          { userId, tipeAnomali: rule.tipeAnomali, err },
          "emergency push fan-out failed",
        ),
      );
    }
  } catch (err) {
    logger.error(
      { userId, tipeAnomali: rule.tipeAnomali, err },
      "failed to process fired anomaly rule — skipping",
    );
  }
}
