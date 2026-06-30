/**
 * activities.controller.ts — Thin controller for daily activity endpoints
 *
 * Pattern: follows fluid.controller.ts — parse req, delegate to service, json/next(err).
 * No business logic here — all validation and computation happens in activities.service.ts.
 *
 * req.user!.id is set by the authenticate middleware (never null in authenticated routes).
 */
import type { Request, Response, NextFunction } from "express";
import * as activitiesService from "../services/activities.service.js";

/**
 * POST /api/activities
 * Create a new daily activity for the authenticated user.
 * Expects { namaKegiatan, estimasiSelesai (HH:mm) } in the request body.
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await activitiesService.createEntry(req.user!.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/activities
 * List activities for a date. Supports ?date=YYYY-MM-DD query param.
 * Defaults to today's date in WIB.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const date =
      typeof req.query.date === "string" ? req.query.date : undefined;

    const activities = await activitiesService.listActivities(req.user!.id, date);
    res.json({ activities });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/activities/active
 * Get the currently active (berlangsung) activity for the user, if any.
 * Returns 200 with the activity or 200 with null body.
 */
export async function getActive(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const activity = await activitiesService.getActiveActivity(req.user!.id);
    res.json(activity);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/activities/all
 * List ALL activities across all dates.
 */
export async function listAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const activities = await activitiesService.listAllActivities(req.user!.id);
    res.json({ activities });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/activities/:id/complete
 * Mark an activity as complete with optional feelings and catatan.
 * Expects optional { perasaan, catatan } in the request body.
 */
export async function complete(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await activitiesService.completeActivity(
      req.user!.id,
      req.params.id as string,
      req.body,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/activities/:id
 * Cancel/delete an activity by ID.
 */
export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await activitiesService.deleteActivity(
      req.user!.id,
      req.params.id as string,
    );
    if (!result) {
      res.status(404).json({ code: "NOT_FOUND", message: "Aktivitas tidak ditemukan" });
      return;
    }
    res.json({ message: "Aktivitas dibatalkan" });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/activities/:id
 * Update an activity's namaKegiatan and/or estimasiSelesai.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await activitiesService.updateActivity(
      req.user!.id,
      req.params.id as string,
      req.body,
    );
    if (!result) {
      res.status(404).json({ code: "NOT_FOUND", message: "Aktivitas tidak ditemukan" });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}
