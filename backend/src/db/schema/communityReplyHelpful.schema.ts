/**
 * communityReplyHelpful.schema.ts — community_reply_helpful join table
 *
 * Enforces "one mark per (reply, user)" for the "membantu" toggle (D-08/D-09)
 * at the database level via a composite unique constraint — the authoritative
 * backstop, not client-side dedup logic (T-06-01).
 *
 * Toggle logic lives in the service layer: find existing row by
 * (replyId, userId); if found, DELETE (unmark, returns marked: false);
 * if not found, INSERT (mark, returns marked: true). helpfulCount is a
 * COUNT(*) aggregate over this table — never a denormalized counter column.
 */
import {
  pgTable,
  uuid,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { communityReplies } from "./communityReply.schema.js";
import { users } from "./users.schema.js";

export const communityReplyHelpful = pgTable(
  "community_reply_helpful",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    replyId: uuid("reply_id")
      .notNull()
      .references(() => communityReplies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_community_reply_helpful_reply_user").on(table.replyId, table.userId),
  ],
);
