/**
 * aiLifestyleSuggestion.schema.ts — ai_lifestyle_suggestions cache table
 *
 * One cached row per (user, tanggal) — cache key is user+date (Assumption A2),
 * mirroring the daily-summary cache-per-day convention.
 *
 * - saranText: AES-256-GCM ciphertext — encrypted in service layer,
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

export const aiLifestyleSuggestions = pgTable(
  "ai_lifestyle_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    // "YYYY-MM-DD" — cache key per user+date
    tanggal: text("tanggal").notNull(),

    // Encrypted narrative (LLM-generated or static fallback), disclaimer appended
    saranText: text("saran_text").notNull(),

    isFallback: boolean("is_fallback").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_ai_lifestyle_suggestion_user_date").on(
      table.userId,
      table.tanggal,
    ),
  ],
);
