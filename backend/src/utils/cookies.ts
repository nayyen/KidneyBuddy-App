import type { CookieOptions } from "express";

// Single source of truth for the refresh-token cookie options.
//
// In production the frontend (Vercel) and backend (Railway) are on different
// domains, so the refresh-token cookie is cross-site. Browsers only deliver a
// cross-site cookie when it is `SameSite=None; Secure` — `sameSite: "strict"`
// would be silently dropped, breaking token refresh. In dev, front and back
// share origin semantics (localhost), so we keep the stricter `strict` +
// non-secure behavior unchanged.
const isProduction = process.env.NODE_ENV === "production";

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "strict",
  path: "/api/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// `res.clearCookie` only matches on name/path/sameSite/secure/httpOnly (not
// maxAge), so this MUST stay identical to `refreshCookieOptions` except for
// `maxAge` or the browser will not remove the cookie. Derived via omission to
// keep the two provably consistent.
const { maxAge: _maxAge, ...clearRefreshCookieOptionsBase } = refreshCookieOptions;
export const clearRefreshCookieOptions: CookieOptions = clearRefreshCookieOptionsBase;
