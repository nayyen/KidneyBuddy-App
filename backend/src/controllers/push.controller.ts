/**
 * push.controller.ts — Thin controller delegating to push.service
 *
 * All subscriptions are stored under the AUTHENTICATED user\'s id (req.user.id).
 * This prevents T-02-02-01: a caller cannot register a subscription for
 * another user\'s account since authenticate middleware sets req.user.
 */
import type { Request, Response, NextFunction } from "express";
import * as pushService from "../services/push.service.js";

export async function subscribeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id; // authenticate middleware guarantees this
    const deviceLabel = req.body?.deviceLabel as string | undefined;
    await pushService.subscribe(userId, req.body, deviceLabel);
    res.status(201).json({ message: "Push subscription berhasil disimpan" });
  } catch (err) {
    next(err);
  }
}

export async function unsubscribeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const endpoint = req.body?.endpoint as string;
    await pushService.unsubscribe(userId, endpoint);
    res.json({ message: "Push subscription berhasil dihapus" });
  } catch (err) {
    next(err);
  }
}
