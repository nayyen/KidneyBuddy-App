import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    succeeded: boolean("succeeded").notNull(),
    attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("idx_login_attempts_email").on(table.email),
    emailTimeIdx: index("idx_login_attempts_email_time").on(
      table.email,
      table.attemptedAt,
    ),
  }),
);
