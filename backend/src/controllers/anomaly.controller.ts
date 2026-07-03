/**
 * anomaly.controller.ts — GET history/active-high-severity, PATCH feedback,
 * POST acknowledge for the `/api/anomaly` API (ANOMALY-02, ANOMALY-04).
 *
 * Thin controller: `req.user!.id` always scopes queries, `next(err)` on
 * catch, matching the fluid/report controller convention.
 *
 * _submitFeedbackCore / _acknowledgeAlertCore are the exact injectable core
 * functions the 05-01 RED scaffold (`anomaly.controller.test.ts`) already
 * commits to as the binding contract — the test's in-memory fake repo shape
 * (`getAlertById(userId, alertId)`, `updateFeedback(alertId, feedback)`,
 * `updateStatus(alertId, status)`) is what `AnomalyRepoDeps<T>` mirrors here.
 * The core functions are generic over the repo's row shape (`T`) so the
 * test's simplified fake state object and the production `AnomalyAlert` row
 * both satisfy the same contract without either side needing a cast.
 */
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as anomalyAlertRepo from "../repositories/anomalyAlert.repository.js";
import type { AnomalyAlert } from "../repositories/anomalyAlert.repository.js";
import { decrypt } from "../lib/encryption.js";

const feedbackBodySchema = z.object({
  feedback: z.enum(["relevan", "tidak_relevan"]),
});

/**
 * `deskripsi` is stored as AES-256-GCM ciphertext (encrypted in
 * anomalyOrchestrator.service.ts before INSERT — see anomalyAlert.schema.ts).
 * Every response that reaches the frontend must decrypt it first, matching
 * the same encrypt-before-INSERT/decrypt-after-SELECT pattern already used
 * by fluid.service.ts/labResult.service.ts — otherwise the emergency modal
 * and alert history would render raw ciphertext instead of the Bahasa
 * Indonesia explanation (Rule 1/2/3 fix — this endpoint had no decrypt step).
 */
function withDecryptedDeskripsi(alert: AnomalyAlert): AnomalyAlert {
  return { ...alert, deskripsi: decrypt(alert.deskripsi) };
}

export type AnomalyRepoDeps<T> = {
  getAlertById: (userId: string, alertId: string) => Promise<T | undefined>;
  updateFeedback: (alertId: string, feedback: string) => Promise<T | undefined>;
  updateStatus: (alertId: string, status: string) => Promise<T | undefined>;
};

/**
 * Thrown by the core functions when the alert doesn't exist or doesn't
 * belong to `userId` (IDOR guard) — controllers catch this and respond 404.
 */
export class AnomalyAlertNotFoundError extends Error {
  constructor() {
    super("Anomaly alert not found or does not belong to this user");
    this.name = "AnomalyAlertNotFoundError";
  }
}

/**
 * Injectable core for ANOMALY-04 feedback persistence. Verifies the alert
 * belongs to `userId` before mutating — defense in depth alongside the
 * production repository's own userId-scoped UPDATE.
 */
export async function _submitFeedbackCore<T>(
  userId: string,
  alertId: string,
  feedback: string,
  repo: AnomalyRepoDeps<T>,
): Promise<T> {
  const alert = await repo.getAlertById(userId, alertId);
  if (!alert) throw new AnomalyAlertNotFoundError();
  const updated = await repo.updateFeedback(alertId, feedback);
  if (!updated) throw new AnomalyAlertNotFoundError();
  return updated;
}

/**
 * Injectable core for the ANOMALY-04/D-07 status lifecycle transition
 * "aktif" -> "dibaca". This DOES persist server-side (unlike the CAPD
 * banner's log-only acknowledge in fluid.controller.ts), because the
 * emergency modal re-checks `aktif` status via the active-high-severity
 * query on every AppShell mount.
 */
export async function _acknowledgeAlertCore<T>(
  userId: string,
  alertId: string,
  repo: AnomalyRepoDeps<T>,
): Promise<T> {
  const alert = await repo.getAlertById(userId, alertId);
  if (!alert) throw new AnomalyAlertNotFoundError();
  const updated = await repo.updateStatus(alertId, "dibaca");
  if (!updated) throw new AnomalyAlertNotFoundError();
  return updated;
}

// Production adapter — binds `userId` into the repository functions' closures
// so the core functions above stay agnostic of the real 3-arg repository
// signatures (`updateFeedback(userId, id, feedback)` etc.).
function repoFor(userId: string): AnomalyRepoDeps<AnomalyAlert> {
  return {
    getAlertById: (uid, id) => anomalyAlertRepo.getAlertById(uid, id),
    updateFeedback: (id, feedback) => anomalyAlertRepo.updateFeedback(userId, id, feedback),
    updateStatus: (id, status) => anomalyAlertRepo.updateStatus(userId, id, status),
  };
}

/**
 * GET /api/anomaly
 * Returns the authenticated user's full alert history (D-09 dedicated alert
 * history page — all alerts, including already-acknowledged ones, remain
 * visible for relevan/tidak_relevan feedback at any time).
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alerts = await anomalyAlertRepo.findAllByUser(req.user!.id);
    res.json({ alerts: alerts.map(withDecryptedDeskripsi) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/anomaly/active-high-severity
 * Used by the emergency modal to re-check whether it must reappear on every
 * AppShell mount (D-07) — server-fetched, never derived from client state.
 */
export async function activeHighSeverity(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const alerts = await anomalyAlertRepo.findActiveHighSeverity(req.user!.id);
    res.json({ alerts: alerts.map(withDecryptedDeskripsi) });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/anomaly/:id/feedback
 * Body: { feedback: "relevan" | "tidak_relevan" } (ANOMALY-04).
 */
export async function feedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = feedbackBodySchema.parse(req.body);
    const userId = req.user!.id;
    const result = await _submitFeedbackCore(
      userId,
      req.params.id as string,
      parsed.feedback,
      repoFor(userId),
    );
    res.json(withDecryptedDeskripsi(result));
  } catch (err) {
    if (err instanceof AnomalyAlertNotFoundError) {
      res.status(404).json({ code: "NOT_FOUND", message: "Alert tidak ditemukan" });
      return;
    }
    next(err);
  }
}

/**
 * POST /api/anomaly/:id/acknowledge
 * Transitions status "aktif" -> "dibaca" (ANOMALY-04, D-07).
 */
export async function acknowledge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await _acknowledgeAlertCore(userId, req.params.id as string, repoFor(userId));
    res.json(withDecryptedDeskripsi(result));
  } catch (err) {
    if (err instanceof AnomalyAlertNotFoundError) {
      res.status(404).json({ code: "NOT_FOUND", message: "Alert tidak ditemukan" });
      return;
    }
    next(err);
  }
}
