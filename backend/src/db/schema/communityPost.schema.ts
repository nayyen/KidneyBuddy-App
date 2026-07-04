/**
 * communityPost.schema.ts — community_posts table schema
 *
 * Quora-style community forum post (COMMUNITY-01/03). Public, peer-visible
 * content — NOT sensitive health data, so no application-layer encryption
 * (see RESEARCH.md Pitfall 1).
 *
 * - kategori: 'pertanyaan' | 'berbagi_pengalaman' | 'informasi' (D-05 filter chips)
 * - metodeTerapi: 'CAPD' | 'HD' | 'Transplantasi' | 'Umum' (D-06 filter —
 *   matches onboarding.service.ts's therapyEnum values, plus 'Umum')
 * - diarsipkan: soft-delete flag (COMMUNITY-03 — never hard-deleted)
 *
 * Indexes:
 * - created_at: newest-first feed ordering (D-07)
 * - (kategori, diarsipkan): category filter
 * - (metode_terapi, diarsipkan): therapy filter
 * - user_id: own-post lookups for archive
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const communityPosts = pgTable(
  "community_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    judul: text("judul").notNull(),
    isi: text("isi").notNull(),

    // 'pertanyaan' | 'berbagi_pengalaman' | 'informasi'
    kategori: text("kategori").notNull(),

    // 'CAPD' | 'HD' | 'Transplantasi' | 'Umum'
    metodeTerapi: text("metode_terapi").notNull(),

    // Soft-delete flag (COMMUNITY-03)
    diarsipkan: boolean("diarsipkan").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_community_posts_created").on(table.createdAt),
    index("idx_community_posts_kategori").on(table.kategori, table.diarsipkan),
    index("idx_community_posts_metode").on(table.metodeTerapi, table.diarsipkan),
    index("idx_community_posts_user").on(table.userId),
  ],
);
