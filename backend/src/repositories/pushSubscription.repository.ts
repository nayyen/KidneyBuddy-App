/**
 * pushSubscription.repository.ts
 *
 * Drizzle repository for push_subscriptions table.
 * Key design decisions (per RESEARCH Pattern 2 and Pitfall 4):
 *
 * - upsertByEndpoint uses CONFLICT on `endpoint` (not user_id) to ensure
 *   each device stays as a separate row even if re-subscribed.
 * - deactivate sets aktif=false WITHOUT deleting, to preserve delivery history.
 */
import { eq } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { db } from "../lib/db.js";
import { pushSubscriptions } from "../db/schema/pushSubscriptions.schema.js";
import type { PushSubscriptionJSON } from "../db/schema/pushSubscriptions.schema.js";

export type PushSubscription = InferSelectModel<typeof pushSubscriptions>;
export type NewPushSubscription = InferInsertModel<typeof pushSubscriptions>;

/**
 * Upsert a push subscription by endpoint.
 * - First call: inserts a new row.
 * - Subsequent call with the same endpoint: updates subscriptionObject,
 *   sets aktif=true, and refreshes lastConfirmedAt.
 * This ensures a re-subscribed device doesn't duplicate rows.
 */
export async function upsertByEndpoint(data: {
  userId: string;
  endpoint: string;
  subscriptionObject: PushSubscriptionJSON;
  deviceLabel?: string;
}): Promise<PushSubscription> {
  const [row] = await db
    .insert(pushSubscriptions)
    .values({
      userId: data.userId,
      endpoint: data.endpoint,
      subscriptionObject: data.subscriptionObject,
      deviceLabel: data.deviceLabel ?? null,
      aktif: true,
      lastConfirmedAt: new Date(),
    })
    .onConflictDoUpdate({
      // Conflict target: endpoint (one row per device URL)
      target: pushSubscriptions.endpoint,
      set: {
        subscriptionObject: data.subscriptionObject,
        aktif: true,
        lastConfirmedAt: new Date(),
      },
    })
    .returning();
  return row;
}

/**
 * Get all active push subscriptions for a user (all their devices).
 * Used by notification fan-out to send to every device.
 */
export async function findActiveByUser(userId: string): Promise<PushSubscription[]> {
  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId as any))
    .then((rows) => rows.filter((r) => r.aktif === true));
}

/**
 * Deactivate a single subscription row (e.g. on HTTP 410 from push service).
 * Does NOT delete — preserves the row for auditing.
 */
export async function deactivate(id: string): Promise<void> {
  await db
    .update(pushSubscriptions)
    .set({ aktif: false })
    .where(eq(pushSubscriptions.id, id as any));
}

export const pushSubscriptionRepo = { upsertByEndpoint, findActiveByUser, deactivate };
