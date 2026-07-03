/**
 * aiWeeklyInsight.schema.ts — ai_weekly_insights cache table
 *
 * One cached row per (user, pekan) — pekan is an ISO week key (e.g. "2026-W27").
 *
 * - wawasanText: AES-256-GCM ciphertext — encrypted in service layer,
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

export const aiWeeklyInsights = pgTable(
  "ai_weekly_insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    // ISO week key, e.g. "2026-W27"
    pekan: text("pekan").notNull(),

    // Encrypted narrative (LLM-generated or static fallback), disclaimer appended
    wawasanText: text("wawasan_text").notNull(),

    isFallback: boolean("is_fallback").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_ai_weekly_insight_user_pekan").on(table.userId, table.pekan),
  ],
);
