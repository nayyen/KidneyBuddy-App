import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Token akses diperlukan" },
    });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch {
    res.status(401).json({
      error: {
        code: "TOKEN_INVALID",
        message: "Token akses tidak valid atau kedaluwarsa",
      },
    });
  }
}
