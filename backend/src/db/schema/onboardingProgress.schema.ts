import { pgTable, uuid, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const onboardingProgress = pgTable("onboarding_progress", {
  userId: uuid("user_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" })
    .unique(),
  lastCompletedStep: integer("last_completed_step").notNull().default(0),
  reminderConfigured: boolean("reminder_configured").default(false),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
