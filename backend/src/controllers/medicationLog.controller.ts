/**
 * medicationLog.controller.ts — Thin Express controller for /api/medication-log.
 * Business logic lives in medicationLog.service.ts.
 */
import type { Request, Response, NextFunction } from "express";
import pino from "pino";
import * as medicationLogService from "../services/medicationLog.service.js";
import { runAnomalyChecksForUser } from "../services/anomalyOrchestrator.service.js";

const logger = pino({ name: "medicationLog.controller" });

/**
 * confirm — POST /api/medication-log/confirm
 * Body: { reminderId: string }
 * Marks the matching medication_log row (or creates one) as dikonfirmasi.
 * T-02-05-02: rejects if reminder doesn't belong to req.user.id.
 */
export async function confirm(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { reminderId } = req.body;
    const result = await medicationLogService.confirm(req.user!.id, reminderId);
    res.json(result);
    // Fire-and-forget anomaly check (ANOMALY-01 "every new tracking entry").
    runAnomalyChecksForUser(req.user!.id).catch((err) =>
      logger.error({ userId: req.user!.id, err }, "per-entry anomaly check failed"),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * confirmById - POST /api/medication-log/:logId/confirm
 * Marks a specific log entry as 'dikonfirmasi'.
 */
export async function confirmById(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { logId } = req.params;
    const result = await medicationLogService.confirmById(req.user!.id, logId);
    res.json(result);
    // Fire-and-forget anomaly check (ANOMALY-01 "every new tracking entry").
    runAnomalyChecksForUser(req.user!.id).catch((err) =>
      logger.error({ userId: req.user!.id, err }, "per-entry anomaly check failed"),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * unconfirmById - POST /api/medication-log/:logId/unconfirm
 * Marks a specific log entry as 'tertunda'.
 */
export async function unconfirmById(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { logId } = req.params;
    const result = await medicationLogService.unconfirmById(req.user!.id, logId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * today — GET /api/medication-log/today
 * Returns all medication log entries for today (all statuses).
 * Used by D-04 Obat card on the dashboard.
 */
export async function today(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const logs = await medicationLogService.getTodayLogs(req.user!.id);
    res.json(logs);
  } catch (err) {
    next(err);
  }
}
