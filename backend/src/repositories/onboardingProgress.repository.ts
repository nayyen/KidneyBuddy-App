import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { onboardingProgress } from "../db/schema/onboardingProgress.schema.js";

export async function upsertProgress(data: {
  userId: string;
  lastCompletedStep: number;
  reminderConfigured?: boolean;
  completedAt?: Date | null;
}) {
  const existing = await findByUserId(data.userId);
  if (existing) {
    const [row] = await db
      .update(onboardingProgress)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(onboardingProgress.userId, data.userId as any))
      .returning();
    return row;
  }
  const [row] = await db.insert(onboardingProgress).values(data).returning();
  return row;
}

export async function findByUserId(userId: string) {
  const [row] = await db
    .select()
    .from(onboardingProgress)
    .where(eq(onboardingProgress.userId, userId as any))
    .limit(1);
  return row ?? null;
}
