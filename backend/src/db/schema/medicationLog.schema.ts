import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";
import { reminderSchedule } from "./reminderSchedule.schema.js";

export const medicationLog = pgTable(
  "medication_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    reminderId: uuid("reminder_id")
      .notNull()
      .references(() => reminderSchedule.id, { onDelete: "cascade" }),
    namaObat: text("nama_obat").notNull(),
    dosis: text("dosis"),
    jenisObat: text("jenis_obat"),                  // 'minum' | 'suntik' | null
    status: text("status").notNull(),               // 'tertunda' | 'dikonfirmasi' | 'terlewat'
    waktuPengingat: timestamp("waktu_pengingat").notNull(),
    waktuKonfirmasi: timestamp("waktu_konfirmasi"), // set when status → dikonfirmasi
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Fast lookup for "today's medications for this user" (D-04 Obat card, GET /today)
    userDateIdx: index("idx_medication_log_user_waktu").on(
      table.userId,
      table.waktuPengingat,
    ),
  }),
);
