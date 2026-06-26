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

  // Phase 2 (02-05): extended medication reminder fields
  dosis: text("dosis"),                            // dose description (obat only)
  jenisObat: text("jenis_obat"),                   // 'minum' | 'suntik' | null (obat only)
  fotoObat: text("foto_obat"),                     // file path to uploaded medication photo
  konsentrasiCapd: text("konsentrasi_capd"),       // CAPD exchange concentration (capd only)
  followUpSent: boolean("follow_up_sent").notNull().default(false), // 30-min follow-up sent flag
  lastNotificationSentAt: timestamp("last_notification_sent_at"), // last push time for dedup
});
