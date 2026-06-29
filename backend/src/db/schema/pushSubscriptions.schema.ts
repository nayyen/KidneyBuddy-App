/**
 * pushSubscriptions.schema.ts — Per-device web push subscription table
 *
 * ARCHITECTURE NOTE: unique constraint is on `endpoint` (per-device URL),
 * NEVER on `user_id`. One user can have multiple active subscriptions
 * (e.g. their phone + caregiver's phone). Unique on user_id would
 * silently break caregiver multi-device delivery (REMIND-08).
 *
 * See RESEARCH.md Pitfall 4 and Plan 02-02 must_haves.
 */
import {
  pgTable,
  uuid,
  text,
  jsonb,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),

  // FK to users — cascade delete so orphaned subscriptions are cleaned up
  userId: uuid("user_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),

  // UNIQUE on endpoint — one row per device, not one row per user.
  // endpoint is the browser-assigned push service URL, globally unique per subscription.
  endpoint: text("endpoint").notNull().unique(),

  // Full PushSubscription JSON from the browser (includes endpoint + keys)
  subscriptionObject: jsonb("subscription_object")
    .$type<PushSubscriptionJSON>()
    .notNull(),

  // Optional device label (e.g. "iPhone 15 Safari") — user-set later
  deviceLabel: text("device_label"),

  // Soft-deactivation: set to false on HTTP 410 from push service
  aktif: boolean("aktif").notNull().default(true),

  // Updated on each re-subscribe; used to surface stale-subscription warning
  lastConfirmedAt: timestamp("last_confirmed_at").notNull().defaultNow(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});
