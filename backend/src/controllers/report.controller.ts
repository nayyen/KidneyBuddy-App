/**
 * report.controller.ts — GET /api/report handler
 *
 * Validates date-range query params with reportQuerySchema, delegates to
 * reportService.generateReport, returns the aggregated report JSON.
 *
 * Implements REPORT-01 with:
 * - 90-day max range enforcement (D-05, T-04-06)
 * - Malformed date rejection (T-04-07)
 * - Authenticated user IDOR boundary (authenticate middleware sets req.user.id)
 */
import type { Request, Response, NextFunction } from "express";
import { reportQuerySchema, reportService } from "../services/report.service.js";

export async function getReport(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dari = String(req.query.dari || "");
    const sampai = String(req.query.sampai || "");

    // Validate with zod — returns 400 on any validation failure
    const parsed = reportQuerySchema.safeParse({ dari, sampai });
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Parameter tanggal tidak valid";
      res.status(400).json({
        code: "INVALID_RANGE",
        message,
      });
      return;
    }

    const report = await reportService.generateReport(
      req.user!.id,
      parsed.data.dari,
      parsed.data.sampai,
    );

    res.json(report);
  } catch (err) {
    next(err);
  }
}
