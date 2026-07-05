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
  // IANA timezone name (e.g. "Asia/Jakarta", "Asia/Makassar"), reported by the
  // client on session load. Nullable + defaulted to "Asia/Jakarta" for existing
  // rows so reminder/display behavior is unchanged until the client reports a
  // real value (quick-260705-9n4 task 2 — per-user device timezone).
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});
