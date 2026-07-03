/**
 * aiLabAnalysis.schema.ts — ai_lab_analyses cache table
 *
 * One cached row per lab_results row (D-16 cache key) — a lab result's AI
 * analysis is generated once and reused, not regenerated on every view.
 *
 * - analisisText: AES-256-GCM ciphertext — encrypted in service layer,
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
import { labResults } from "./labResult.schema.js";

export const aiLabAnalyses = pgTable(
  "ai_lab_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    labResultId: uuid("lab_result_id")
      .notNull()
      .references(() => labResults.id, { onDelete: "cascade" }),

    // Encrypted narrative (LLM-generated or static fallback), disclaimer appended
    analisisText: text("analisis_text").notNull(),

    isFallback: boolean("is_fallback").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_ai_lab_analysis_lab_result").on(table.labResultId),
  ],
);
