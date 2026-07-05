/**
 * dailyActivity.schema.ts — daily_activities table schema
 *
 * Stores daily activity logging entries per user (ACTIVITY-01).
 * - status: 'berlangsung' | 'selesai'
 * - catatanPerasaan: AES-256-GCM ciphertext — encryption applied in service layer
 * - reminderSent: boolean flag for activity end-time push deduplication
 *
 * Indexes:
 * - (user_id, status): find active activity for a user
 * - (estimasi_selesai, status, reminder_sent): cron job finds due-for-end-reminder activities
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const dailyActivities = pgTable(
  "daily_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    // Activity name — free text, validated at service layer
    namaKegiatan: text("nama_kegiatan").notNull(),

    // When the activity was started — defaults to now
    waktuMulai: timestamp("waktu_mulai").notNull().defaultNow(),

    // When the user estimates it will end (server-combined WIB date + HH:mm)
    estimasiSelesai: timestamp("estimasi_selesai").notNull(),

    // 'berlangsung' | 'selesai'
    status: text("status").notNull().default("berlangsung"),

    // When the activity was actually completed — nullable until marked done
    waktuSelesai: timestamp("waktu_selesai"),

    // Feelings rating: null | 'nyaman' | 'biasa' | 'lelah' | 'berat'
    perasaan: text("perasaan"),

    // AES-256-GCM ciphertext — encrypted in service layer
    catatanPerasaan: text("catatan_perasaan"),

    // Deduplication flag for pre-end-time push (03-02 cron)
    reminderSent: boolean("reminder_sent").notNull().default(false),

    // Deduplication flag for the SECOND, gentler follow-up push sent ~10min
    // after estimasiSelesai if the activity is still berlangsung
    // (quick-260705-r8b bug 3 backend, activityFollowUp.job.ts).
    followUpSent: boolean("follow_up_sent").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userStatusIdx: index("idx_daily_activities_user_status").on(table.userId, table.status),
    estimasiEndIdx: index("idx_daily_activities_estimasi_end").on(
      table.estimasiSelesai,
      table.status,
      table.reminderSent,
    ),
  }),
);
