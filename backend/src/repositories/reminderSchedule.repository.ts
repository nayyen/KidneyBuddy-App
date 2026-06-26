import { eq, and, lte, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { reminderSchedule } from "../db/schema/reminderSchedule.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type ReminderSchedule = InferSelectModel<typeof reminderSchedule>;
export type NewReminderSchedule = InferInsertModel<typeof reminderSchedule>;

// ─── Insert ────────────────────────────────────────────────────────────

export async function insert(data: NewReminderSchedule): Promise<ReminderSchedule> {
  const [row] = await db.insert(reminderSchedule).values(data).returning();
  return row;
}

// ─── Query ────────────────────────────────────────────────────────────

export async function listByUser(userId: string): Promise<ReminderSchedule[]> {
  return db
    .select()
    .from(reminderSchedule)
    .where(eq(reminderSchedule.userId, userId as any));
}

export async function findById(id: string): Promise<ReminderSchedule | undefined> {
  const [row] = await db
    .select()
    .from(reminderSchedule)
    .where(eq(reminderSchedule.id, id as any))
    .limit(1);
  return row;
}

export async function findByIdAndUser(
  id: string,
  userId: string,
): Promise<ReminderSchedule | undefined> {
  const [row] = await db
    .select()
    .from(reminderSchedule)
    .where(
      and(
        eq(reminderSchedule.id, id as any),
        eq(reminderSchedule.userId, userId as any),
      ),
    )
    .limit(1);
  return row;
}

/**
 * Find the next upcoming active reminder for a user based on current time.
 * Compares jam_pengingat (HH:mm) against the current time-of-day in Jakarta time.
 * Returns the soonest reminder today, or the first reminder tomorrow if none today.
 */
export async function findNextUpcoming(
  userId: string,
): Promise<ReminderSchedule | undefined> {
  // Get current time in HH:mm
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${hours}:${mins}`;

  // Find the next active reminder at or after current time
  const rows = await db
    .select()
    .from(reminderSchedule)
    .where(
      and(
        eq(reminderSchedule.userId, userId as any),
        eq(reminderSchedule.aktif, true),
        lte(reminderSchedule.jamPengingat, sql`'23:59'`),  // all valid times
      ),
    );

  // Sort by jam_pengingat; return first one >= currentTime (or wrap to smallest)
  const active = rows.filter((r) => r.aktif);
  if (active.length === 0) return undefined;

  const upcoming = active.filter((r) => r.jamPengingat >= currentTime);
  if (upcoming.length > 0) {
    return upcoming.sort((a, b) => a.jamPengingat.localeCompare(b.jamPengingat))[0];
  }
  // Wrap: return the earliest tomorrow
  return active.sort((a, b) => a.jamPengingat.localeCompare(b.jamPengingat))[0];
}

// ─── Mutations ────────────────────────────────────────────────────────

export async function update(
  id: string,
  userId: string,
  data: Partial<Omit<NewReminderSchedule, "id" | "userId" | "createdAt">>,
): Promise<ReminderSchedule | undefined> {
  const [row] = await db
    .update(reminderSchedule)
    .set(data)
    .where(
      and(
        eq(reminderSchedule.id, id as any),
        eq(reminderSchedule.userId, userId as any),
      ),
    )
    .returning();
  return row;
}

export async function remove(id: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(reminderSchedule)
    .where(
      and(
        eq(reminderSchedule.id, id as any),
        eq(reminderSchedule.userId, userId as any),
      ),
    )
    .returning({ id: reminderSchedule.id });
  return result.length > 0;
}

/**
 * Deactivate all therapy-specific reminders (jenis = 'capd' or 'hd') for a user.
 * Called when the user's therapy method changes (REMIND-07).
 * Only targets the specified jenis — medication (obat) reminders are NEVER touched.
 */
export async function deactivateTherapySpecific(
  userId: string,
  jenisToDeactivate: string,
): Promise<void> {
  await db
    .update(reminderSchedule)
    .set({ aktif: false })
    .where(
      and(
        eq(reminderSchedule.userId, userId as any),
        eq(reminderSchedule.jenis, jenisToDeactivate),
      ),
    );
}
