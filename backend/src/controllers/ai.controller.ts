/**
 * ai.controller.ts — GET cached daily summary/weekly insight, POST manual
 * regenerate for the `/api/ai` API (AI-01, AI-02).
 *
 * Thin controller: `req.user!.id` always scopes queries, `next(err)` on
 * catch — matches the fluid/anomaly controller convention. Neither GET
 * endpoint ever calls Groq (cache-only reads, D-16); only the POST
 * regenerate endpoint forces a fresh generation.
 *
 * A Groq-call failure inside generateAndCacheDailySummary/
 * generateAndCacheWeeklyInsight throws an AppError (503, "AI_UNAVAILABLE")
 * — see aiSummary.service.ts/aiInsight.service.ts's D-18 handling — which
 * `next(err)` forwards to the existing errorHandler, so the client sees the
 * friendly Bahasa Indonesia message via the same error envelope as every
 * other endpoint, not a generic 500.
 */
import type { Request, Response, NextFunction } from "express";
import * as aiSummaryService from "../services/aiSummary.service.js";
import * as aiInsightService from "../services/aiInsight.service.js";

/**
 * GET /api/ai/daily-summary
 * Cache-only read of today's (WIB) daily summary. Never calls Groq.
 */
export async function getDailySummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await aiSummaryService.getDailySummary(req.user!.id);
    if (!result) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: "Belum ada ringkasan untuk hari ini",
      });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ai/daily-summary/regenerate
 * Manual trigger (D-10) — forces a fresh Groq narration even if a cached
 * summary already exists for today.
 */
export async function regenerateDailySummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await aiSummaryService.generateAndCacheDailySummary(req.user!.id, {
      force: true,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/ai/weekly-insight
 * Cache-only read of this WIB ISO-week's insight. Never calls Groq.
 */
export async function getWeeklyInsight(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await aiInsightService.getWeeklyInsight(req.user!.id);
    if (!result) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: "Belum ada wawasan mingguan untuk minggu ini",
      });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}
