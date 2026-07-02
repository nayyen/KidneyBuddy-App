import { eq, and, lte, sql, isNull, or, lt } from "drizzle-orm";
import { db } from "../lib/db.js";
import { reminderSchedule } from "../db/schema/reminderSchedule.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { wibHHmm, wibDayNameLower, wibTomorrowDayNameLower } from "../utils/wib.js";

export type ReminderSchedule = InferSelectModel<typeof reminderSchedule>;
export type NewReminderSchedule = InferInsertModel<typeof reminderSchedule>;

export interface NextUpcomingGrouped {
  obat: ReminderSchedule | null;
  cuciDarah: ReminderSchedule | null;
}

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
 * Get all active 'obat' reminders for a user (for JS-side hariAktif filtering).
 */
export async function findActiveObatByUser(userId: string): Promise<ReminderSchedule[]> {
  return db
    .select()
    .from(reminderSchedule)
    .where(
      and(
        eq(reminderSchedule.userId, userId as any),
        eq(reminderSchedule.jenis, "obat"),
        eq(reminderSchedule.aktif, true),
      ),
    );
}

/**
 * Find today's active 'obat' reminders that do NOT yet have a medication_log entry
 * for today. This ensures the ObatCard shows scheduled reminders, not just dispatched ones.
 */
export async function findTodayObatReminders(
  userId: string,
  todayDayName: string,
): Promise<ReminderSchedule[]> {
  // Use raw SQL for jsonb containment check (? operator)
  const rows = await db.execute(
    sql`
      SELECT * FROM reminder_schedule
      WHERE user_id = ${userId}
        AND jenis = 'obat'
        AND aktif = true
          AND jsonb_exists(hari_aktif, ${todayDayName})
        AND id NOT IN (
          SELECT reminder_id FROM medication_log
          WHERE user_id = ${userId}
            AND waktu_pengingat >= CURRENT_DATE
            AND waktu_pengingat < CURRENT_DATE + INTERVAL '1 day'
        )
      ORDER BY jam_pengingat ASC
    `,
  );
  return (rows as any).rows as ReminderSchedule[];
}

/**
 * Find the next upcoming active reminder for a user based on current time.
 * Compares jam_pengingat (HH:mm) against the current time-of-day in Jakarta time.
 * Returns the soonest reminder today, or the first reminder tomorrow if none today.
 */
export async function findNextUpcoming(
  userId: string,
): Promise<NextUpcomingGrouped> {
  // WIB-correct current time + day names for hariAktif filtering
  const currentTime = wibHHmm();
  const todayDay = wibDayNameLower();
  const tomorrowDay = wibTomorrowDayNameLower();

  // Fetch all active reminders for the user (JS-side filtering for hariAktif)
  const rows = await db
    .select()
    .from(reminderSchedule)
    .where(
      and(
        eq(reminderSchedule.userId, userId as any),
        eq(reminderSchedule.aktif, true),
      ),
    );

  const active = rows.filter((r) => r.aktif);

  // Helper: find next upcoming in a subset of reminders
  const findNext = (reminders: ReminderSchedule[]): ReminderSchedule | null => {
    // Filter: aktif, non-empty hariAktif, scheduled for today
    const todayReminders = reminders.filter((r) => {
      const hari = (r.hariAktif as string[]) ?? [];
      return hari.length > 0 && hari.includes(todayDay);
    });
    // Next at or after current WIB time today
    const upcomingToday = todayReminders
      .filter((r) => r.jamPengingat >= currentTime)
      .sort((a, b) => a.jamPengingat.localeCompare(b.jamPengingat));
    if (upcomingToday.length > 0) return upcomingToday[0];

    // Wrap: earliest tomorrow (only if tomorrow's day is in hariAktif)
    const tomorrowReminders = reminders.filter((r) => {
      const hari = (r.hariAktif as string[]) ?? [];
      return hari.length > 0 && hari.includes(tomorrowDay);
    });
    const earliestTomorrow = tomorrowReminders
      .sort((a, b) => a.jamPengingat.localeCompare(b.jamPengingat));
    if (earliestTomorrow.length > 0) return earliestTomorrow[0];

    return null;
  };

  const obatReminders = active.filter((r) => r.jenis === "obat");
  const cuciDarahReminders = active.filter(
    (r) => r.jenis === "capd" || r.jenis === "hd",
  );

  return {
    obat: findNext(obatReminders),
    cuciDarah: findNext(cuciDarahReminders),
  };
}

// ─── Mutations ────────────────────────────────────────────────────────

export async function update(
  id: string,
  userId: string,
  data: Partial<Omit<NewReminderSchedule, "id" | "userId" | "createdAt">>,
): Promise<ReminderSchedule | undefined> {
  const [row] = await db
    .update(reminderSchedule)
    .set({ ...data, updatedAt: new Date() })
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
/**
 * Find all active reminders due at the given HH:mm on the given Indonesian day name.
 * Guards against duplicate dispatch: last_notification_sent_at must be NULL or older than 90s.
 * Used by dispatchDueReminders every minute.
 */
export async function findDueReminders(
  currentTime: string,  // "HH:mm"
  dayName: string,      // Indonesian day name e.g. "Senin"
): Promise<ReminderSchedule[]> {
  const cutoff = new Date(Date.now() - 90 * 1000);
  return db
    .select()
    .from(reminderSchedule)
    .where(
      and(
        eq(reminderSchedule.aktif, true),
        eq(reminderSchedule.jamPengingat, currentTime),
        // jsonb array contains the current day name
        sql`${reminderSchedule.hariAktif}::jsonb @> ${JSON.stringify([dayName])}::jsonb`,
        // dedup guard: null or older than 90s
        or(
          isNull(reminderSchedule.lastNotificationSentAt),
          lt(reminderSchedule.lastNotificationSentAt, cutoff),
        ),
      ),
    );
}

/**
 * Mark last_notification_sent_at = now and reset follow_up_sent to false (new dispatch cycle).
 */
export async function markDispatched(id: string): Promise<void> {
  await db
    .update(reminderSchedule)
    .set({ lastNotificationSentAt: new Date(), followUpSent: false })
    .where(eq(reminderSchedule.id, id as any));
}

/**
 * Mark follow_up_sent = true so exactly one follow-up is sent per missed dose.
 */
export async function markFollowUpSent(id: string): Promise<void> {
  await db
    .update(reminderSchedule)
    .set({ followUpSent: true })
    .where(eq(reminderSchedule.id, id as any));
}

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
