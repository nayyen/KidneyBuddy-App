import { z } from "zod";
import crypto from "node:crypto";
import { hashPassword, verifyPassword } from "../utils/passwordHash.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { AppError } from "../middleware/errorHandler.js";
import * as userRepository from "../repositories/user.repository.js";
import * as refreshTokenRepository from "../repositories/refreshToken.repository.js";
import * as loginAttemptRepository from "../repositories/loginAttempt.repository.js";
import * as passwordResetTokenRepository from "../repositories/passwordResetToken.repository.js";
import { sendPasswordResetEmail } from "./email.service.js";

// ─── Register Schema & Logic ───────────────────────────────────────────

export const registerSchema = z.object({
  namaLengkap: z.string().min(1, "Nama lengkap wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  konfirmasiPassword: z.string(),
  nomorTelepon: z.string().min(1, "Nomor telepon wajib diisi"),
  tanggalLahir: z.string().min(1, "Tanggal lahir wajib diisi"),
  informedConsent: z.boolean().refine((val) => val === true, {
    message: "Kamu harus menyetujui syarat dan ketentuan",
  }),
}).refine((data) => data.password === data.konfirmasiPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ["konfirmasiPassword"],
});

export type RegisterPayload = z.infer<typeof registerSchema>;

export async function register(payload: RegisterPayload) {
  const parsed = registerSchema.parse(payload);

  const existing = await userRepository.findByEmail(parsed.email);
  if (existing) {
    throw new AppError(409, "EMAIL_EXISTS", "Email sudah terdaftar");
  }

  const passwordHash = await hashPassword(parsed.password);

  const user = await userRepository.insertUser({
    namaLengkap: parsed.namaLengkap,
    email: parsed.email,
    passwordHash,
    nomorTelepon: parsed.nomorTelepon,
    tanggalLahir: parsed.tanggalLahir,
    informedConsent: parsed.informedConsent,
  });

  // Issue tokens immediately so user doesn't need to login again
  const accessToken = signAccessToken(user.userId);
  const refreshToken = signRefreshToken(user.userId);

  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await refreshTokenRepository.insertRefreshToken({
    userId: user.userId,
    tokenHash,
    deviceLabel: "registration",
    expiresAt,
  });

  const { passwordHash: _hash, ...safeUser } = user;
  return { accessToken, refreshToken, user: safeUser };
}

export async function getProfile(email: string) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User tidak ditemukan");
  }
  const { passwordHash: _hash, ...safeUser } = user;
  return safeUser;
}

// ─── Login Schema ──────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

// ─── Lockout Constants ─────────────────────────────────────────────────

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ─── Login ─────────────────────────────────────────────────────────────

export async function login(
  params: { email: string; password: string },
  deviceLabel?: string,
) {
  const { email, password } = loginSchema.parse(params);

  // --- Lockout check (Postgres-backed, not MemoryStore) ---
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MS);
  const recentFailures = await loginAttemptRepository.countRecentFailures(
    email,
    since,
  );

  if (recentFailures >= LOCKOUT_THRESHOLD) {
    // Get the timestamp of the 5th-most-recent failure to compute lockout end
    // We store lockedUntil = now + 15min for simplicity; the frontend
    // countdown uses the lockedUntil returned in the error.
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    throw new AppError(423, "ACCOUNT_LOCKED", "Akun terkunci sementara", {
      lockedUntil: lockedUntil.toISOString(),
    });
  }

  // --- Verify credentials ---
  const user = await userRepository.findByEmail(email);
  if (!user) {
    // Record attempt and throw generic error to avoid user enumeration
    await loginAttemptRepository.recordAttempt(email, false);
    throw new AppError(401, "INVALID_CREDENTIALS", "Email atau password salah");
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    await loginAttemptRepository.recordAttempt(email, false);
    throw new AppError(401, "INVALID_CREDENTIALS", "Email atau password salah");
  }

  // --- Success — record attempt and issue tokens ---
  await loginAttemptRepository.recordAttempt(email, true);

  const accessToken = signAccessToken(user.userId);
  const refreshToken = signRefreshToken(user.userId);

  // Store refresh token hash
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30d
  await refreshTokenRepository.insertRefreshToken({
    userId: user.userId,
    tokenHash,
    deviceLabel,
    expiresAt,
  });

  const { passwordHash: _hash, ...safeUser } = user;
  return { accessToken, refreshToken, user: safeUser };
}

// ─── Refresh ───────────────────────────────────────────────────────────

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, "REFRESH_INVALID", "Token refresh tidak valid");
  }

  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const stored = await refreshTokenRepository.findValidToken(tokenHash);
  if (!stored) {
    throw new AppError(401, "REFRESH_INVALID", "Token refresh tidak valid atau sudah dicabut");
  }

  // Issue new access token
  const accessToken = signAccessToken(payload.sub);

  const user = await userRepository.findById(payload.sub);
  if (!user) {
    throw new AppError(401, "USER_NOT_FOUND", "User tidak ditemukan");
  }

  const { passwordHash: _hash, ...safeUser } = user;
  return { accessToken, user: safeUser };
}

// ─── Logout ────────────────────────────────────────────────────────────

export async function logout(refreshToken: string) {
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await refreshTokenRepository.revokeToken(tokenHash);
}

// ─── Get Me (authenticated) ────────────────────────────────────────────

export async function getMe(userId: string) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User tidak ditemukan");
  }
  const { passwordHash: _hash, ...safeUser } = user;
  return safeUser;
}

// ─── Forgot Password Schema & Logic ────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z.string().email("Format email tidak valid"),
});

export async function forgotPassword(params: { email: string }) {
  const { email } = forgotPasswordSchema.parse(params);

  const user = await userRepository.findByEmail(email);

  // Always return generic success (no enumeration leak)
  if (!user) {
    return { message: "Jika email terdaftar, tautan reset sudah dikirim" };
  }

  // Generate random token, store hash
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // ~1 hour

  await passwordResetTokenRepository.create({
    userId: user.userId,
    tokenHash,
    expiresAt,
  });

  try {
    await sendPasswordResetEmail(email, rawToken);
  } catch (err) {
    // Swallow — a send failure (e.g. Resend outage) must never leak via the
    // response (no user enumeration) nor break the forgot-password flow.
    console.error("[auth.service] sendPasswordResetEmail failed", err);
  }

  return { message: "Jika email terdaftar, tautan reset sudah dikirim" };
}

// ─── Reset Password Schema & Logic ─────────────────────────────────────

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token wajib diisi"),
  newPassword: z.string().min(8, "Password minimal 8 karakter"),
  konfirmasiPassword: z.string(),
}).refine((data) => data.newPassword === data.konfirmasiPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ["konfirmasiPassword"],
});

export async function resetPassword(params: {
  token: string;
  newPassword: string;
  konfirmasiPassword: string;
}) {
  const { token, newPassword } = resetPasswordSchema.parse(params);

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  // Atomic: find + mark used in one UPDATE — no race condition
  const stored = await passwordResetTokenRepository.consumeIfValid(tokenHash);

  if (!stored) {
    throw new AppError(
      400,
      "RESET_TOKEN_INVALID",
      "Tautan reset tidak valid atau sudah kadaluarsa",
    );
  }

  // Update password
  const passwordHash = await hashPassword(newPassword);
  await userRepository.updatePasswordHash(stored.userId, passwordHash);

  // Revoke all refresh tokens (force re-login everywhere)
  await refreshTokenRepository.revokeAllUserTokens(stored.userId);
}
