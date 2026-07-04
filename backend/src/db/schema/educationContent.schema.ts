/**
 * educationContent.schema.ts — education_content table schema
 *
 * Static, seeded reference material (EDU-01) — articles, exercise guides,
 * lifestyle content. Shared/public, not user-scoped (no user_id column) and
 * not sensitive health data — no application-layer encryption.
 *
 * - tipeKonten: 'artikel' | 'panduan_senam' | 'gaya_hidup' (display/grouping axis)
 * - metodeTerapi: 'CAPD' | 'HD' | 'Transplantasi' | 'Umum' (EDU-01 filter axis)
 * - gambarUrl: nullable static illustration path — no video per D-11
 *
 * Indexes:
 * - metode_terapi: EDU-01 therapy-method filter
 * - tipe_konten: content-type grouping
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const educationContent = pgTable(
  "education_content",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    judul: text("judul").notNull(),
    // Short preview shown on cards
    ringkasan: text("ringkasan").notNull(),
    // Full article body
    isi: text("isi").notNull(),

    // 'artikel' | 'panduan_senam' | 'gaya_hidup'
    tipeKonten: text("tipe_konten").notNull(),

    // 'CAPD' | 'HD' | 'Transplantasi' | 'Umum'
    metodeTerapi: text("metode_terapi").notNull(),

    // Static illustration path — nullable, no video per D-11
    gambarUrl: text("gambar_url"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_education_metode").on(table.metodeTerapi),
    index("idx_education_tipe").on(table.tipeKonten),
  ],
);
