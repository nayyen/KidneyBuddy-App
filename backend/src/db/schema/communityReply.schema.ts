/**
 * communityReply.schema.ts — community_replies table schema
 *
 * Child replies to a community_posts row (COMMUNITY-02). Public, peer-visible
 * content — NOT sensitive health data, so no application-layer encryption.
 *
 * Indexes:
 * - (post_id, created_at): fetch a post's replies in chronological order
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { communityPosts } from "./communityPost.schema.js";
import { users } from "./users.schema.js";

export const communityReplies = pgTable(
  "community_replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    isi: text("isi").notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_community_replies_post").on(table.postId, table.createdAt),
  ],
);
