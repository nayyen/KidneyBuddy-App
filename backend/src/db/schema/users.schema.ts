import {
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  userId: uuid("user_id").primaryKey().defaultRandom(),
  namaLengkap: text("nama_lengkap").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nomorTelepon: text("nomor_telepon").notNull(),
  tanggalLahir: date("tanggal_lahir").notNull(),
  informedConsent: boolean("informed_consent").notNull().default(false),
  metodeTerapiAktif: text("metode_terapi_aktif"),
  tanggalMulaiTerapi: date("tanggal_mulai_terapi"),
  role: text("role").notNull().default("Pasien"),
  riwayatTerapi: jsonb("riwayat_terapi").default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});
