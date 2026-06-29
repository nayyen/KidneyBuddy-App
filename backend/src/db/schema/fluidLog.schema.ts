/**
 * fluidLog.schema.ts — fluid_log table schema
 *
 * Stores fluid intake (masuk) and output (keluar) entries per user per day.
 * The `catatan` column stores AES-256-GCM ciphertext — encryption is applied
 * in the service layer (fluid.service.ts) before INSERT, never in the schema.
 *
 * Indexed on (user_id, tanggal) for efficient daily balance queries.
 * Per RESEARCH.md Pattern 6 and CLAUDE.md NFR-02.
 */
import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const fluidLog = pgTable(
  "fluid_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    // Date as text string (YYYY-MM-DD) — timezone-safe; avoids date/timezone conversion
    tanggal: text("tanggal").notNull(),

    // Time as text — 'HH:mm' for scheduled, or ISO string for retroactive entries
    waktu: text("waktu").notNull(),

    // 'masuk' (intake) | 'keluar' (output)
    tipe: text("tipe").notNull(),

    // Source — relevant primarily for masuk entries
    // 'minuman' | 'makanan' | 'capd' | 'lainnya' | null (for keluar)
    sumber: text("sumber"),

    // CAPD-specific fields — null for non-CAPD patients
    konsentrasiCapd: text("konsentrasi_capd"),

    // Numeric with scale 2 to support decimal volumes (e.g. 1.75 kg)
    volume: numeric("volume", { precision: 8, scale: 2 }).notNull(),

    // 'ml' (default) | 'kg'
    satuan: text("satuan").notNull().default("ml"),

    // CAPD outflow condition — null for masuk entries
    // 'jernih' | 'keruh' | 'keruh_gumpalan' | 'berdarah'
    kondisiKeluar: text("kondisi_keluar"),

    // Free-text note — stored as AES-256-GCM ciphertext (iv:authTag:cipher)
    // NEVER encrypt in this schema; encryption happens in fluid.service.ts
    catatan: text("catatan"),

    // True for retroactive entries entered after the actual event time
    isLateEntry: boolean("is_late_entry").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Index for daily balance queries and list-by-date queries
    userDateIdx: index("idx_fluid_log_user_date").on(table.userId, table.tanggal),
  })
);
