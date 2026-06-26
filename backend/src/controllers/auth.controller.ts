import type { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service.js";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await authService.register(req.body);

    // Set refresh token as httpOnly cookie — NEVER in JSON body
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      accessToken: result.accessToken,
      user: result.user,
    });
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

// ─── Login ─────────────────────────────────────────────────────────────

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const deviceLabel = (req.headers["user-agent"] ?? "").slice(0, 200);
    const result = await authService.login(req.body, deviceLabel);

    // Set refresh token as httpOnly cookie — NEVER in JSON body
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Return access token + user in JSON body (not refresh token)
    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Refresh ───────────────────────────────────────────────────────────

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({
        error: { code: "NO_REFRESH_TOKEN", message: "Tidak ada token refresh" },
      });
      return;
    }

    const result = await authService.refresh(token);

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Logout ────────────────────────────────────────────────────────────

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await authService.logout(token);
    }

    // Clear the cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
    });

    res.json({ message: "Berhasil logout" });
  } catch (err) {
    next(err);
  }
}

// ─── Me (authenticated) ────────────────────────────────────────────────

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// ─── Forgot Password ───────────────────────────────────────────────────

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await authService.forgotPassword(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─── Reset Password ───────────────────────────────────────────────────

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await authService.resetPassword(req.body);
    res.json({ message: "Password berhasil diubah. Silakan login." });
  } catch (err) {
    next(err);
  }
}
