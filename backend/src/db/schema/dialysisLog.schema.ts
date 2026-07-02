import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";
import { reminderSchedule } from "./reminderSchedule.schema.js";

/**
 * dialysis_log — Cuci Darah (HD/CAPD session) compliance log
 *
 * Mirrors medication_log structure but for dialysis session confirmation.
 * Tracks whether a patient completed a scheduled HD/CAPD session.
 * status: 'tertunda' | 'dikonfirmasi' | 'terlewat'
 */
export const dialysisLog = pgTable(
  "dialysis_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    reminderId: uuid("reminder_id")
      .notNull()
      .references(() => reminderSchedule.id, { onDelete: "cascade" }),
    jenis: text("jenis").notNull(), // 'capd' | 'hd'
    nama: text("nama").notNull(),
    konsentrasiCapd: text("konsentrasi_capd"), // CAPD only, nullable
    status: text("status").notNull(), // 'tertunda' | 'dikonfirmasi' | 'terlewat'
    waktuPengingat: timestamp("waktu_pengingat").notNull(),
    waktuKonfirmasi: timestamp("waktu_konfirmasi"), // set when status → dikonfirmasi
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userDateIdx: index("idx_dialysis_log_user_waktu").on(
      table.userId,
      table.waktuPengingat,
    ),
  }),
);
