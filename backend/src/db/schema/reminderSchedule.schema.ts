import { pgTable, uuid, text, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const reminderSchedule = pgTable("reminder_schedule", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),
  jenis: text("jenis").notNull(), // 'obat' | 'capd' | 'hd'
  nama: text("nama").notNull(),
  jamPengingat: text("jam_pengingat").notNull(),
  hariAktif: jsonb("hari_aktif").default([]),
  catatanWaktu: text("catatan_waktu"),
  aktif: boolean("aktif").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
