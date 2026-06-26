import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "../lib/db.js";
import { passwordResetTokens } from "../db/schema/passwordResetTokens.schema.js";

export async function create(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  const [row] = await db.insert(passwordResetTokens).values(data).returning();
  return row;
}

export async function findValidByTokenHash(tokenHash: string) {
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function markUsed(id: string) {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, id as any));
}

/**
 * Atomically find a valid (unused, not expired) token by hash and mark it used.
 * Returns the token row if consumed, or null if already used/expired/missing.
 * This is atomic — no race condition between find and markUsed.
 */
export async function consumeIfValid(tokenHash: string) {
  const [row] = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .returning();
  return row ?? null;
}
