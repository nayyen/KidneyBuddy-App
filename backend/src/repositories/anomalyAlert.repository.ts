/**
 * anomalyAlert.repository.ts — anomaly_alerts CRUD, dedup, and range queries
 *
 * IDOR-safe (T-05-03): every function takes `userId` as its first parameter
 * and every query filters `WHERE user_id = ...` — no function accepts a bare
 * alert id without also scoping to the caller's userId.
 *
 * Pattern: follows report.repository.ts's `and(eq(...userId), ...)` query
 * composition and fluidLog.repository.ts's IDOR-safe update/delete shape.
 */
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { db } from "../lib/db.js";
import { anomalyAlerts } from "../db/schema/anomalyAlert.schema.js";
import { wibDayBounds } from "../utils/wib.js";

export type AnomalyAlert = InferSelectModel<typeof anomalyAlerts>;

// userId is always supplied as an explicit first argument (never trusted from
// the payload) — omit it from the insert-input type to make that contract explicit.
export type NewAnomalyAlertInput = Omit<
  InferInsertModel<typeof anomalyAlerts>,
  "userId" | "id" | "createdAt"
>;

// Alert lifecycle states that still count as "unresolved" for same-day dedup
// (Pitfall 3 / Open Question 2): don't re-fire while a prior alert of the
// same type is still aktif/dibaca (not yet ditindaklanjuti).
const UNRESOLVED_STATUSES = ["aktif", "dibaca"] as const;

// Optional transaction-scoped client — `findActiveByType` and `insertAlert`
// accept this (defaulting to the module-level `db`) so
// anomalyOrchestrator.service.ts can run the dedup-check-then-insert
// sequence inside a single transaction guarded by a Postgres advisory lock
// (code review WR-03, 2026-07-04), closing the TOCTOU race where two
// near-simultaneous tracking entries could both pass the dedup check before
// either had inserted, producing duplicate alerts/duplicate emergency pushes.
type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// ─── Insert ────────────────────────────────────────────────────────────────

export async function insertAlert(
  userId: string,
  data: NewAnomalyAlertInput,
  dbClient: DbClient = db,
): Promise<AnomalyAlert> {
  const [row] = await dbClient
    .insert(anomalyAlerts)
    .values({ ...data, userId } as any)
    .returning();
  return row;
}

// ─── Query ─────────────────────────────────────────────────────────────────

/**
 * Find unresolved (aktif/dibaca) alerts of a given type CREATED TODAY (WIB)
 * for same-day dedup — don't insert a new alert of this type while one from
 * today is still unresolved (Pitfall 3, Open Question 2).
 *
 * Bounded to today's WIB day on purpose (code review CR-01, 2026-07-04): an
 * unbounded "any unresolved row, regardless of age" check meant a single
 * acknowledged-but-never-actioned ("dibaca") alert could permanently block
 * every future occurrence of that anomaly type for a patient, forever — a
 * genuine recurrence days/weeks later (e.g. a second CAPD peritonitis
 * episode) would silently never re-fire, contradicting the reminder/alert
 * reliability core value. Bounding to "today" means a recurrence on any
 * later day is always eligible to fire again, regardless of whether
 * yesterday's alert was ever read or given feedback.
 */
export async function findActiveByType(
  userId: string,
  tipeAnomali: string,
  dbClient: DbClient = db,
): Promise<AnomalyAlert[]> {
  const { start, end } = wibDayBounds();
  return dbClient
    .select()
    .from(anomalyAlerts)
    .where(
      and(
        eq(anomalyAlerts.userId, userId as any),
        eq(anomalyAlerts.tipeAnomali, tipeAnomali),
        inArray(anomalyAlerts.status, UNRESOLVED_STATUSES as unknown as string[]),
        gte(anomalyAlerts.createdAt, start),
        lte(anomalyAlerts.createdAt, end),
      ),
    );
}

/**
 * Fetch a single alert by id, IDOR-scoped to userId — used by the anomaly
 * controller's feedback/acknowledge core functions to verify ownership before
 * mutating (defense in depth alongside updateFeedback/updateStatus's own
 * userId-scoped WHERE clause).
 */
export async function getAlertById(
  userId: string,
  id: string,
): Promise<AnomalyAlert | undefined> {
  const [row] = await db
    .select()
    .from(anomalyAlerts)
    .where(and(eq(anomalyAlerts.userId, userId as any), eq(anomalyAlerts.id, id as any)))
    .limit(1);
  return row;
}

/**
 * Fetch every alert for a user, newest first — powers the `/api/anomaly`
 * history list (D-09's dedicated alert history page, all alerts visible for
 * relevan/tidak_relevan feedback at any time).
 */
export async function findAllByUser(userId: string): Promise<AnomalyAlert[]> {
  return db
    .select()
    .from(anomalyAlerts)
    .where(eq(anomalyAlerts.userId, userId as any))
    .orderBy(desc(anomalyAlerts.createdAt));
}

/**
 * Fetch all alerts for a user within a WIB-correct date range — used by the
 * doctor report's "Anomali Terdeteksi" section (D-15).
 */
export async function findByUserAndRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<AnomalyAlert[]> {
  const { start } = wibDayBounds(startDate);
  const { end } = wibDayBounds(endDate);

  return db
    .select()
    .from(anomalyAlerts)
    .where(
      and(
        eq(anomalyAlerts.userId, userId as any),
        gte(anomalyAlerts.createdAt, start as any),
        lte(anomalyAlerts.createdAt, end as any),
      ),
    )
    .orderBy(asc(anomalyAlerts.createdAt));
}

/**
 * Find still-active high-severity alerts — used to re-check whether the
 * non-dismissable emergency modal must reappear on app open (D-07).
 */
export async function findActiveHighSeverity(userId: string): Promise<AnomalyAlert[]> {
  return db
    .select()
    .from(anomalyAlerts)
    .where(
      and(
        eq(anomalyAlerts.userId, userId as any),
        eq(anomalyAlerts.severity, "tinggi"),
        eq(anomalyAlerts.status, "aktif"),
      ),
    );
}

// ─── Mutations ─────────────────────────────────────────────────────────────

/**
 * Update an alert's lifecycle status ('aktif' | 'dibaca' | 'ditindaklanjuti').
 * IDOR-safe — returns undefined if no row matched (wrong userId or id).
 */
export async function updateStatus(
  userId: string,
  id: string,
  status: string,
): Promise<AnomalyAlert | undefined> {
  const [row] = await db
    .update(anomalyAlerts)
    .set({ status })
    .where(
      and(eq(anomalyAlerts.userId, userId as any), eq(anomalyAlerts.id, id as any)),
    )
    .returning();
  return row;
}

/**
 * Persist user feedback ('relevan' | 'tidak_relevan') on an alert (ANOMALY-04).
 * IDOR-safe — returns undefined if no row matched (wrong userId or id).
 */
export async function updateFeedback(
  userId: string,
  id: string,
  feedback: string,
): Promise<AnomalyAlert | undefined> {
  const [row] = await db
    .update(anomalyAlerts)
    .set({ feedbackPengguna: feedback })
    .where(
      and(eq(anomalyAlerts.userId, userId as any), eq(anomalyAlerts.id, id as any)),
    )
    .returning();
  return row;
}
