import { eq, desc } from "drizzle-orm";
import { db } from "../lib/db.js";
import { therapyHistory } from "../db/schema/therapyHistory.schema.js";

export async function append(
  userId: string,
  metodeSebelum: string | null,
  metodeBaru: string,
): Promise<void> {
  await db.insert(therapyHistory).values({
    userId: userId as any,
    metodeSebelum,
    metodeBaru,
  });
}

export async function findByUser(userId: string) {
  const rows = await db
    .select()
    .from(therapyHistory)
    .where(eq(therapyHistory.userId, userId as any))
    .orderBy(desc(therapyHistory.changedAt));
  return rows;
}
