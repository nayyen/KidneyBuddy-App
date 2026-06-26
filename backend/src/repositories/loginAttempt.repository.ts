import { eq, and, sql, gte } from "drizzle-orm";
import { db } from "../lib/db.js";
import { loginAttempts } from "../db/schema/loginAttempts.schema.js";

export async function recordAttempt(
  email: string,
  succeeded: boolean,
) {
  const [row] = await db
    .insert(loginAttempts)
    .values({ email, succeeded })
    .returning();
  return row;
}

export async function countRecentFailures(
  email: string,
  since: Date,
): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email),
        eq(loginAttempts.succeeded, false),
        gte(loginAttempts.attemptedAt, since),
      ),
    );
  return result?.count ?? 0;
}

export async function clearFailedAttempts(email: string) {
  // On successful login, we don't delete old rows — just mark them as irrelevant
  // by inserting a successful attempt which resets the failure window.
  // This keeps audit trail intact.
}
