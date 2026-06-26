/**
 * push.service.ts — Subscribe / Unsubscribe business logic
 *
 * Validates incoming PushSubscription JSON before passing to repository.
 * zod schema matches the W3C PushSubscription serialisation format.
 */
import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";
import {
  upsertByEndpoint,
  findActiveByUser,
  deactivate,
} from "../repositories/pushSubscription.repository.js";

// ─── Validation schema ─────────────────────────────────────────────────────
// Matches the PushSubscription JSON serialised by the browser
// https://www.w3.org/TR/push-api/#pushsubscription-interface

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url("Push endpoint must be a valid URL"),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1, "p256dh key required"),
    auth: z.string().min(1, "auth key required"),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

// ─── Subscribe ─────────────────────────────────────────────────────────────

export async function subscribe(
  userId: string,
  body: unknown,
  deviceLabel?: string,
): Promise<void> {
  const parsed = pushSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, "Format push subscription tidak valid: " + parsed.error.message);
  }
  const sub = parsed.data;
  await upsertByEndpoint({
    userId,
    endpoint: sub.endpoint,
    subscriptionObject: sub,
    deviceLabel,
  });
}

// ─── Unsubscribe ───────────────────────────────────────────────────────────

export async function unsubscribe(userId: string, endpoint: string): Promise<void> {
  if (!endpoint) {
    throw new AppError(400, "Endpoint push subscription wajib diisi");
  }
  // Find the subscription by endpoint under this user and deactivate it
  const subs = await findActiveByUser(userId);
  const target = subs.find((s) => s.endpoint === endpoint);
  if (!target) {
    // Idempotent: already gone is fine
    return;
  }
  await deactivate(target.id);
}
