import { eq, isNull } from "drizzle-orm";
import { db } from "../lib/db.js";
import { users } from "../db/schema/users.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export async function insertUser(data: NewUser): Promise<User> {
  const [row] = await db.insert(users).values(data).returning();
  return row;
}

export async function findByEmail(email: string): Promise<User | undefined> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row;
}

export async function findById(userId: string): Promise<User | undefined> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.userId, userId as any))
    .limit(1);
  return row;
}

export async function updatePasswordHash(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.userId, userId as any));
}

/**
 * Find every non-soft-deleted user (deletedAt IS NULL) — used by the 21:00
 * anomaly batch (ANOMALY-01) to iterate all active users sequentially.
 */
export async function findAllActive(): Promise<User[]> {
  return db.select().from(users).where(isNull(users.deletedAt));
}

/**
 * Find every non-soft-deleted user's userId only — used by the AI-01/AI-02
 * batches (dailySummary.job.ts / weeklyInsight.job.ts) which only need the
 * id to iterate, not the full row. Thin wrapper over `findAllActive()` to
 * avoid a duplicate query (same WHERE deletedAt IS NULL predicate).
 */
export async function findAllActiveUsers(): Promise<string[]> {
  const rows = await findAllActive();
  return rows.map((u) => u.userId);
}

export async function updateTherapyMethod(
  userId: string,
  metodeTerapiAktif: string,
  tanggalMulaiTerapi: string,
  riwayatTerapi: unknown[],
): Promise<void> {
  await db
    .update(users)
    .set({ metodeTerapiAktif, tanggalMulaiTerapi, riwayatTerapi, updatedAt: new Date() })
    .where(eq(users.userId, userId as any));
}

/**
 * Persist the client-reported IANA timezone (quick-260705-9n4 task 2).
 * Called once per session when the browser's Intl-resolved timezone differs
 * from what's already stored.
 */
export async function updateTimezone(
  userId: string,
  timezone: string,
): Promise<void> {
  await db
    .update(users)
    .set({ timezone, updatedAt: new Date() })
    .where(eq(users.userId, userId as any));
}

/**
 * Distinct IANA timezones currently in use among non-soft-deleted users.
 * Used by reminderDispatch.job.ts to iterate one due-check pass per distinct
 * timezone (quick-260705-9n4 task 2) instead of one global WIB pass.
 */
export async function findDistinctActiveTimezones(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ timezone: users.timezone })
    .from(users)
    .where(isNull(users.deletedAt));
  return rows.map((r) => r.timezone).filter((tz): tz is string => Boolean(tz));
}
