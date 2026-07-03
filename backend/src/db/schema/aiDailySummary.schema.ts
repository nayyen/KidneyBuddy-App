/**
 * aiDailySummary.schema.ts — ai_daily_summaries cache table
 *
 * One cached row per (user, tanggal) — regenerating a summary for the same
 * day overwrites/upserts against the unique constraint rather than growing
 * unbounded history (D-16-style cache-per-day convention).
 *
 * - ringkasanText: AES-256-GCM ciphertext — encrypted in service layer,
 *   already includes the appended AI_DISCLAIMER (AI-05/D-19) before storage.
 * - isFallback: internal only — never exposed to frontend.
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const aiDailySummaries = pgTable(
  "ai_daily_summaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    // "YYYY-MM-DD" — matches fluidLog.tanggal convention
    tanggal: text("tanggal").notNull(),

    // Encrypted narrative (LLM-generated or static fallback), disclaimer appended
    ringkasanText: text("ringkasan_text").notNull(),

    isFallback: boolean("is_fallback").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_ai_daily_summary_user_date").on(table.userId, table.tanggal),
  ],
);
