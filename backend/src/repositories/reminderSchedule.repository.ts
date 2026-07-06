import { eq, and, lte, sql, isNull, or, lt, gte, isNotNull } from "drizzle-orm";
import { db } from "../lib/db.js";
import { reminderSchedule } from "../db/schema/reminderSchedule.schema.js";
import { users } from "../db/schema/users.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { wibHHmm, wibDayNameLower, wibTomorrowDayNameLower, wibDayBounds } from "../utils/wib.js";
import { medicationLog } from "../db/schema/medicationLog.schema.js";
import { dialysisLog } from "../db/schema/dialysisLog.schema.js";
import { isReminderVisibleForTherapy } from "../lib/therapyReminderScope.js";

export type ReminderSchedule = InferSelectModel<typeof reminderSchedule>;
export type NewReminderSchedule = InferInsertModel<typeof reminderSchedule>;

export interface NextUpcomingGrouped {
  obat: ReminderSchedule[];
  cuciDarah: ReminderSchedule[];
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
 * Get all active Cuci Darah (capd + hd) reminders for a user.
 */
export async function findActiveCuciDarahByUser(
  userId: string,
): Promise<ReminderSchedule[]> {
  return db
    .select()
    .from(reminderSchedule)
    .where(
      and(
        eq(reminderSchedule.userId, userId as any),
        eq(reminderSchedule.aktif, true),
        or(
          eq(reminderSchedule.jenis, "capd"),
          eq(reminderSchedule.jenis, "hd"),
        ),
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
 * _computeNextUpcomingCore — pure, DB-free core of findNextUpcoming's
 * grouping/selection logic (quick-260706-8zc item 1 verification). Extracted
 * so the therapy-scoping-before-earliest-slot-selection fix is unit
 * testable without a live Postgres connection.
 *
 * `active` must already be pre-filtered to aktif=true, non-empty hariAktif,
 * and NOT already-confirmed-today (the DB-dependent parts of
 * findNextUpcoming). `metode` is the user's current metodeTerapiAktif.
 */
export function _computeNextUpcomingCore(
  active: ReminderSchedule[],
  metode: string | null,
  ctx: { currentTime: string; todayDay: string; tomorrowDay: string },
): NextUpcomingGrouped {
  const { currentTime, todayDay, tomorrowDay } = ctx;

  const findNext = (reminders: ReminderSchedule[]): ReminderSchedule[] => {
    const todayReminders = reminders.filter((r) =>
      ((r.hariAktif as string[]) ?? []).includes(todayDay)
    );

    const upcomingToday = todayReminders
      .filter((r) => r.jamPengingat >= currentTime)
      .sort((a, b) => a.jamPengingat.localeCompare(b.jamPengingat));

    if (upcomingToday.length > 0) {
      const nextTime = upcomingToday[0].jamPengingat;
      return upcomingToday.filter((r) => r.jamPengingat === nextTime);
    }

    // quick-260706-epn: tomorrow-fallback removed. The card is now strictly
    // today-only — when today has no more upcoming reminders, it must show
    // the empty state ("Tidak ada pengingat berikutnya") rather than
    // surfacing a reminder that is not active for today's day-of-week (e.g.
    // a Selasa+Sabtu-only reminder must never appear as "next" on Senin,
    // even though tomorrow is Selasa). This also subsumes quick-260705-r8b
    // bug 1 (a today-slot-already-passed reminder reverting into "next"),
    // since there is no longer any fallback path for it to revert through.
    return [];
  };

  const obatReminders = active.filter((r) => r.jenis === "obat");

  // quick-260706-8zc (item 1 verification): therapy-scope BEFORE computing
  // "next" — findNext() picks the single earliest jamPengingat slot across
  // ALL capd+hd reminders and discards every other slot. If an off-therapy
  // reminder (e.g. a leftover HD reminder while the user is now on CAPD)
  // happens to have an earlier jam_pengingat than the user's actual active-
  // therapy reminder, that off-therapy slot would "win" the earliest-slot
  // computation and the real next cuci-darah reminder would be silently
  // dropped entirely (not just filtered afterward) since findNext() only
  // returns items sharing the winning nextTime. Filtering by therapy first
  // ensures the earliest-slot computation only ever considers reminders the
  // user can actually act on. (getNextUpcoming() in reminders.service.ts
  // still applies isReminderVisibleForTherapy again as a defensive no-op
  // backstop.)
  const cuciDarahReminders = active.filter(
    (r) =>
      (r.jenis === "capd" || r.jenis === "hd") &&
      isReminderVisibleForTherapy(r.jenis, metode),
  );

  return {
    obat: findNext(obatReminders),
    cuciDarah: findNext(cuciDarahReminders),
  };
}

/**
 * Find the next upcoming active reminder for a user based on current time.
 * Compares jam_pengingat (HH:mm) against the current time-of-day in Jakarta time.
 * Returns the soonest reminder today, or the first reminder tomorrow if none today.
 */
export async function findNextUpcoming(
  userId: string,
): Promise<NextUpcomingGrouped> {
  const currentTime = wibHHmm();
  const todayDay = wibDayNameLower();
  const tomorrowDay = wibTomorrowDayNameLower();

  // Get IDs of reminders already confirmed today.
  //
  // BUG FIX (quick-260707-0uc): `new Date().setHours(0,0,0,0)` uses the
  // Node process's LOCAL day, which inside the Docker container is UTC, not
  // WIB. Between 00:00-07:00 WIB that UTC-day window doesn't yet include
  // "today WIB" at all (it's still "yesterday" in UTC terms until 17:00 UTC
  // previous day rolls to the new UTC date), wrongly hiding a dose confirmed
  // yesterday-evening WIB, and after 07:00 WIB it wrongly counts early-
  // morning-WIB confirmations against the wrong calendar day. Anchoring to
  // wibDayBounds() (already used by currentTime/todayDay above) makes the
  // exclusion window match the patient's actual WIB calendar day.
  const { start: todayStart, end: todayEnd } = wibDayBounds();

  const confirmedMedicationIds = (await db
    .select({ reminderId: medicationLog.reminderId })
    .from(medicationLog)
    .where(and(
      eq(medicationLog.userId, userId as any),
      eq(medicationLog.status, "dikonfirmasi"),
      gte(medicationLog.waktuKonfirmasi, todayStart),
      lte(medicationLog.waktuKonfirmasi, todayEnd),
      isNotNull(medicationLog.reminderId),
    ))
  ).map(r => r.reminderId) as string[];

  const confirmedDialysisIds = (await db
    .select({ reminderId: dialysisLog.reminderId })
    .from(dialysisLog)
    .where(and(
      eq(dialysisLog.userId, userId as any),
      eq(dialysisLog.status, "dikonfirmasi"),
      gte(dialysisLog.waktuKonfirmasi, todayStart),
      lte(dialysisLog.waktuKonfirmasi, todayEnd),
      isNotNull(dialysisLog.reminderId),
    ))
  ).map(r => r.reminderId) as string[];

  const confirmedIds = [...new Set([...confirmedMedicationIds, ...confirmedDialysisIds])];

  const rows = await db
    .select()
    .from(reminderSchedule)
    .where(
      and(
        eq(reminderSchedule.userId, userId as any),
        eq(reminderSchedule.aktif, true),
      ),
    );

  const active = rows.filter((r) => {
    const hari = (r.hariAktif as string[]) ?? [];
    return r.aktif && hari.length > 0 && !confirmedIds.includes(r.id);
  });

  const userRow = await db
    .select({ metodeTerapiAktif: users.metodeTerapiAktif })
    .from(users)
    .where(eq(users.userId, userId as any))
    .limit(1);
  const metode = userRow[0]?.metodeTerapiAktif ?? null;

  return _computeNextUpcomingCore(active, metode, {
    currentTime,
    todayDay,
    tomorrowDay,
  });
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
 * Find all active reminders due at the given HH:mm on the given Indonesian day name.
 * Guards against duplicate dispatch: last_notification_sent_at must be NULL or older than 90s.
 * Used by dispatchDueReminders every minute.
 *
 * Therapy-scoped (quick-260705-q7w): joins users so cuci-darah (capd/hd)
 * reminders only dispatch when their jenis matches the owner's CURRENT
 * metodeTerapiAktif — obat always dispatches via the OR below. Without
 * this, Task 1's removal of the destructive aktif=false deactivation would
 * otherwise let a stale therapy's cuci-darah reminders keep firing pushes.
 */
export async function findDueReminders(
  currentTime: string,  // "HH:mm"
  dayName: string,      // Indonesian day name e.g. "Senin"
): Promise<ReminderSchedule[]> {
  const cutoff = new Date(Date.now() - 90 * 1000);
  const rows = await db
    .select({ reminderSchedule })
    .from(reminderSchedule)
    .innerJoin(users, eq(reminderSchedule.userId, users.userId))
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
        // therapy scoping: obat always passes; capd/hd only when it matches
        // the owner's current active therapy method
        or(
          eq(reminderSchedule.jenis, "obat"),
          sql`lower(${users.metodeTerapiAktif}) = ${reminderSchedule.jenis}`,
        ),
      ),
    );
  return rows.map((r) => r.reminderSchedule);
}

/**
 * Find all active reminders due at the given HH:mm/day-name whose OWNER's
 * stored timezone equals `timezone` (quick-260705-9n4 task 2). Same dedup
 * guard as findDueReminders(); joins users to scope by per-user timezone
 * instead of assuming every user is on WIB.
 *
 * Therapy-scoped (quick-260705-q7w): same jenis-vs-metodeTerapiAktif OR
 * condition as findDueReminders() above — obat always dispatches; cuci-darah
 * only dispatches for the owner's currently active therapy.
 */
export async function findDueRemindersForTimezone(
  currentTime: string, // "HH:mm"
  dayName: string, // Indonesian day name, lowercase e.g. "senin"
  timezone: string,
): Promise<ReminderSchedule[]> {
  const cutoff = new Date(Date.now() - 90 * 1000);
  const rows = await db
    .select({ reminderSchedule })
    .from(reminderSchedule)
    .innerJoin(users, eq(reminderSchedule.userId, users.userId))
    .where(
      and(
        eq(reminderSchedule.aktif, true),
        eq(reminderSchedule.jamPengingat, currentTime),
        eq(users.timezone, timezone),
        sql`${reminderSchedule.hariAktif}::jsonb @> ${JSON.stringify([dayName])}::jsonb`,
        or(
          isNull(reminderSchedule.lastNotificationSentAt),
          lt(reminderSchedule.lastNotificationSentAt, cutoff),
        ),
        or(
          eq(reminderSchedule.jenis, "obat"),
          sql`lower(${users.metodeTerapiAktif}) = ${reminderSchedule.jenis}`,
        ),
      ),
    );
  return rows.map((r) => r.reminderSchedule);
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
