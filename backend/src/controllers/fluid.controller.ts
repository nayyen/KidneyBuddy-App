/**
 * fluid.controller.ts — Thin controller for fluid tracking endpoints
 *
 * Pattern: follows onboarding.controller.ts — parse req, delegate to service, json/next(err).
 * No business logic here — all validation and computation happens in fluid.service.ts.
 *
 * req.user!.id is set by the authenticate middleware (never null in authenticated routes).
 */
import type { Request, Response, NextFunction } from "express";
import * as fluidService from "../services/fluid.service.js";
import { wibDateStr } from "../utils/wib.js";

/**
 * POST /api/fluid
 * Create a new fluid log entry for the authenticated user.
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await fluidService.createEntry(req.user!.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/fluid/:id
 * Permanently delete a fluid log entry for the authenticated user.
 */
export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const deleted = await fluidService.deleteEntry(req.user!.id, req.params.id as string);
    if (!deleted) {
      res.status(404).json({ code: "NOT_FOUND", message: "Catatan cairan tidak ditemukan" });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
}
/**
 * GET /api/fluid/daily-balance?date=YYYY-MM-DD
 * Returns the server-computed daily fluid balance for the authenticated user.
 * Defaults to today's date if no date query param is provided.
 */
export async function getDailyBalance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const date =
      typeof req.query.date === "string"
        ? req.query.date
          : wibDateStr();

    const balance = await fluidService.getDailyBalance(req.user!.id, date);
    res.json(balance);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/fluid/acknowledge-abnormal
 * Records that the user has acknowledged a CAPD effluent anomaly alert (T-02-04-05).
 * Lightweight audit log entry — does not create a new DB record (banner is client-dismissed).
 * Always responds 200 so the frontend banner can dismiss non-blocking.
 */
export async function acknowledgeAbnormal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const acknowledgedAt =
      typeof req.body?.acknowledgedAt === "string"
        ? req.body.acknowledgedAt
        : new Date().toISOString();
    // Audit log — visible in container stdout for incident review
    console.log(
      `[CAPD-ACK] userId=${userId} acknowledgedAt=${acknowledgedAt} ip=${req.ip}`,
    );
    res.json({ acknowledged: true, acknowledgedAt });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/fluid?date=YYYY-MM-DD
 * Returns fluid log entries for the authenticated user for a given date.
 * Defaults to today's date if no date query param is provided.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const date =
      typeof req.query.date === "string"
        ? req.query.date
            : wibDateStr();

    const entries = await fluidService.getEntriesByDate(req.user!.id, date);
    res.json({ date, entries });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/fluid/:id
 * Update an existing fluid log entry for the authenticated user.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await fluidService.updateEntry(req.user!.id, req.params.id as string, req.body);
    if (!result) {
      res.status(404).json({ code: "NOT_FOUND", message: "Catatan cairan tidak ditemukan" });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}
