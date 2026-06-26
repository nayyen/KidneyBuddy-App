import { eq } from "drizzle-orm";
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
