import {
  pgTable,
  uuid,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const therapyHistory = pgTable("therapy_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),
  metodeSebelum: text("metode_sebelum"),
  metodeBaru: text("metode_baru").notNull(),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});
