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
        : new Date().toISOString().slice(0, 10);

    const balance = await fluidService.getDailyBalance(req.user!.id, date);
    res.json(balance);
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
        : new Date().toISOString().slice(0, 10);

    const entries = await fluidService.getEntriesByDate(req.user!.id, date);
    res.json({ date, entries });
  } catch (err) {
    next(err);
  }
}
