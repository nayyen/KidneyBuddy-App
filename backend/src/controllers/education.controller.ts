/**
 * education.controller.ts — Thin controller for education content endpoints
 *
 * Pattern: follows labResult.controller.ts — parse req, delegate to service,
 * json/next(err). No business logic, no request-schema validation, no
 * repository imports here — all of that lives in the service layer.
 */
import type { Request, Response, NextFunction } from "express";
import * as educationContentService from "../services/educationContent.service.js";

/**
 * GET /api/education
 * List education content, optionally filtered by ?metodeTerapi= and ?tipeKonten=.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const metodeTerapi =
      typeof req.query.metodeTerapi === "string" ? req.query.metodeTerapi : undefined;
    const tipeKonten =
      typeof req.query.tipeKonten === "string" ? req.query.tipeKonten : undefined;

    const content = await educationContentService.listContent({
      metodeTerapi,
      tipeKonten,
    });
    res.json({ content });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/education/:id
 * Get one education article's full body.
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const row = await educationContentService.getContentDetail(req.params.id as string);
    if (!row) {
      res.status(404).json({ code: "NOT_FOUND", message: "Konten tidak ditemukan" });
      return;
    }
    res.json(row);
  } catch (err) {
    next(err);
  }
}
