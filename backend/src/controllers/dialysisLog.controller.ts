/**
 * dialysisLog.controller.ts — Thin Express controller for /api/dialysis-log.
 * Business logic lives in dialysisLog.service.ts.
 */
import type { Request, Response, NextFunction } from "express";
import * as dialysisLogService from "../services/dialysisLog.service.js";

/**
 * confirm — POST /api/dialysis-log/confirm
 * Body: { reminderId: string }
 * Marks the matching dialysis_log row (or creates one) as dikonfirmasi.
 */
export async function confirm(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { reminderId } = req.body;
    const result = await dialysisLogService.confirm(req.user!.id, reminderId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * today — GET /api/dialysis-log/today
 * Returns all dialysis log entries for today (all statuses).
 */
export async function today(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const logs = await dialysisLogService.getTodayLogs(req.user!.id);
    res.json(logs);
  } catch (err) {
    next(err);
  }
}
