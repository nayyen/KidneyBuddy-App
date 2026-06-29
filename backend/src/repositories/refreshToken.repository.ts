import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { refreshTokens } from "../db/schema/refreshTokens.schema.js";

export async function insertRefreshToken(params: {
  userId: string;
  tokenHash: string;
  deviceLabel?: string;
  expiresAt: Date;
}) {
  const [row] = await db.insert(refreshTokens).values(params).returning();
  return row;
}

export async function findValidToken(tokenHash: string) {
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        sql`${refreshTokens.expiresAt} > NOW()`,
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function revokeToken(tokenHash: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function revokeAllUserTokens(userId: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.userId, userId as any),
        isNull(refreshTokens.revokedAt),
      ),
    );
}
