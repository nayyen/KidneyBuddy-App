/**
 * anomalyAlert.schema.ts — anomaly_alerts table
 *
 * One row per detected anomaly (deterministic rule engine, D-01..D-04, plus
 * LLM-generated or static-fallback explanation, D-19/D-20).
 *
 * - deskripsi: AES-256-GCM ciphertext — encrypted in service layer, contains
 *   the LLM narration (or STATIC_FALLBACK_TEMPLATES text if D-20 triggers).
 * - status: 'aktif' | 'dibaca' | 'ditindaklanjuti' (PRD §8.8 alert lifecycle).
 * - isFallback: internal only — never exposed to frontend (per UI-SPEC: no
 *   visual differentiation between LLM output and static fallback).
 * - ruleData: raw numeric/contextual inputs the rule engine evaluated,
 *   for audit/debugging (not shown to the end user).
 *
 * Indexes:
 * - (user_id, created_at): recent-alerts feed / history page
 * - (user_id, tipe_anomali, status): same-day duplicate-alert dedup lookup (Pitfall 3)
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const anomalyAlerts = pgTable(
  "anomaly_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    // e.g. "kondisi_cairan_abnormal" | "jadwal_terlewat" | "penurunan_volume_keluar" | "pola_asupan_menyimpang"
    tipeAnomali: text("tipe_anomali").notNull(),

    // 'normal' | 'tinggi' — fixed per tipeAnomali by the rule engine (D-02)
    severity: text("severity").notNull(),

    // 0-100, scaled by rule engine per anomaly magnitude
    confidenceScore: integer("confidence_score").notNull(),

    // Encrypted narrative explanation (LLM-generated or static fallback)
    deskripsi: text("deskripsi").notNull(),

    // 'aktif' | 'dibaca' | 'ditindaklanjuti' — PRD §8.8
    status: text("status").notNull().default("aktif"),

    // 'relevan' | 'tidak_relevan' | null — user feedback on alert usefulness
    feedbackPengguna: text("feedback_pengguna"),

    // Patient therapy type context at time of detection (e.g. "capd", "hd")
    tipePasien: text("tipe_pasien").notNull(),

    // Raw numeric/contextual rule inputs (audit/debug only, not user-facing)
    ruleData: jsonb("rule_data").default({}),

    // Internal only — true if D-20 forbidden-phrase check swapped in the
    // static fallback template instead of the LLM's own explanation.
    isFallback: boolean("is_fallback").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_anomaly_user_created").on(table.userId, table.createdAt),
    index("idx_anomaly_user_type_status").on(
      table.userId,
      table.tipeAnomali,
      table.status,
    ),
  ],
);
