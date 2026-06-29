/**
 * labResult.schema.ts — lab_results table schema
 *
 * Each row represents one lab parameter from a single examination date.
 * - sumber: 'manual' (user typed the value) | 'upload' (extracted from file — 03-05)
 * - catatan: AES-256-GCM ciphertext — encrypted in service layer
 * - diarsipkan: soft-delete flag (LAB-04 — never hard-deleted)
 *
 * Indexes:
 * - (user_id, tanggal_pemeriksaan): date-scoped queries for trend chart
 * - (user_id, nama_parameter, diarsipkan): parameter lookups with archive filter
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const labResults = pgTable(
  "lab_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    // When the lab test was performed
    tanggalPemeriksaan: date("tanggal_pemeriksaan").notNull(),

    // Optional grouping: "Fungsi Ginjal", "Elektrolit", "Darah Lengkap", etc.
    kategori: text("kategori"),

    // Parameter name: "Kreatinin", "Hemoglobin", "Kalium", etc.
    namaParameter: text("nama_parameter").notNull(),

    // Value as text — supports decimal, integer, or range-like values
    nilai: text("nilai").notNull(),

    // Unit: "mg/dL", "g/dL", "mEq/L", "mmol/L", etc.
    satuan: text("satuan"),

    // Reference range: "0.6-1.2", "< 200", etc.
    nilaiRujukan: text("nilai_rujukan"),

    // Encrypted notes about this lab result
    catatan: text("catatan"),

    // 'manual' | 'upload'
    sumber: text("sumber").notNull().default("manual"),

    // FK to files table (for uploaded documents — used in 03-05)
    fileId: uuid("file_id"),

    // Soft-delete flag (LAB-04)
    diarsipkan: boolean("diarsipkan").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_lab_user_date").on(table.userId, table.tanggalPemeriksaan),
    index("idx_lab_user_param").on(table.userId, table.namaParameter, table.diarsipkan),
  ],
);
