import type { Request, Response, NextFunction } from "express";
import * as profileService from "../services/profile.service.js";

export async function changeTherapy(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await profileService.changeTherapyMethod(
      req.user!.id,
      req.body.newMethod,
      req.body.confirmed,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTherapyHistory(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const history = await profileService.getTherapyHistory(req.user!.id);
    res.json(history);
  } catch (err) {
    next(err);
  }
}
