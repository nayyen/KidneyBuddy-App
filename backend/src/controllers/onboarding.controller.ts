import type { Request, Response, NextFunction } from "express";
import * as onboardingService from "../services/onboarding.service.js";

export async function getProgress(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const progress = await onboardingService.getProgress(req.user!.id);
    res.json(progress);
  } catch (err) {
    next(err);
  }
}

export async function getTherapyContent(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const content = onboardingService.getTherapyContent();
    res.json(content);
  } catch (err) {
    next(err);
  }
}

export async function saveTherapy(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await onboardingService.saveTherapyMethod(
      req.user!.id,
      req.body.therapy,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function saveReminder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await onboardingService.saveFirstReminder(
      req.user!.id,
      req.body,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function skipReminder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await onboardingService.skipFirstReminder(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
