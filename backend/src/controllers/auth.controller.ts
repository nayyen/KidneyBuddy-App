import type { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service.js";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const email = req.query.email as string;
    if (!email) {
      res.status(400).json({ error: { code: "MISSING_EMAIL", message: "Parameter email diperlukan" } });
      return;
    }
    const user = await authService.getProfile(email);
    res.json(user);
  } catch (err) {
    next(err);
  }
}
