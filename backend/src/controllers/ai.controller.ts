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
import * as aiLabAnalysisService from "../services/aiLabAnalysis.service.js";
import * as aiLifestyleService from "../services/aiLifestyle.service.js";

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

/**
 * GET /api/ai/lab-analysis/:labResultId
 * Cache-only read of a single lab result's AI analysis (AI-03). Never calls
 * Groq — generation happens asynchronously via the fire-and-forget trigger
 * on lab save (D-14). Returns `{ ready: false }` (200) both when the
 * analysis simply hasn't finished generating yet AND when the labResultId
 * doesn't exist / isn't owned by this user (T-05-14) — the IDOR-safe
 * repository join can't distinguish the two cases, and collapsing them
 * avoids leaking existence of another user's lab result via a 404 vs. 200
 * status-code oracle.
 */
export async function getLabAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const labResultId = req.params.labResultId as string;
    const result = await aiLabAnalysisService.getLabAnalysis(req.user!.id, labResultId);
    if (!result) {
      res.json({ ready: false });
      return;
    }
    res.json({ ready: true, ...result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/ai/lifestyle
 * Gate-checked read of the personalized lifestyle suggestion (AI-04).
 * Returns a gated marker (no Groq call) if the user has <3 days of
 * tracking data; otherwise lazily generates-or-caches for today (WIB) —
 * this surface has no separate manual regenerate route (D-13 simplicity).
 */
export async function getLifestyleSuggestion(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await aiLifestyleService.getLifestyleSuggestion(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
