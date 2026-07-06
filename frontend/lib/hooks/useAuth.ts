"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch, ApiError } from "@/lib/api";

// ─── Types (declared before module-level code that references them) ──────────

interface User {
  userId: string;
  namaLengkap: string;
  email: string;
  metodeTerapiAktif: string | null;
  tanggalMulaiTerapi: string | null;
  role: string;
  createdAt: string;
}

// Module-level singleton: all useAuth() instances share one refresh call on mount.
// Prevents multiple simultaneous /api/auth/refresh calls from consuming a
// rotating refresh token twice (AppShell + page component both call useAuth()).
let _refreshPromise: Promise<{ accessToken: string; user: User } | null> | null = null;

async function getOrFetchSession(): Promise<{ accessToken: string; user: User } | null> {
  if (!_refreshPromise) {
    _refreshPromise = apiFetch<{ accessToken: string; user: User }>("/api/auth/refresh", {
      method: "POST",
    }).catch(() => null);
    // Clear the singleton after it settles so logout + re-login can refresh again
    _refreshPromise.finally(() => {
      setTimeout(() => { _refreshPromise = null; }, 100);
    });
  }
  return _refreshPromise;
}

// ─── Additional Types ─────────────────────────────────────────────────────────

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResult {
  accessToken: string;
  user: User;
}

interface RefreshResult {
  accessToken: string;
  user: User;
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useAuth() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // initial auth check
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const tokenRef = useRef<string | null>(null); // for closures

  // Keep ref in sync
  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  // ── Initial auth check: try to refresh on mount ──────────────────
  // Uses a module-level singleton so multiple simultaneous useAuth() instances
  // (AppShell + page) share one network call instead of firing separate requests
  // that would each consume a rotating refresh token.
  useEffect(() => {
    let cancelled = false;
    getOrFetchSession().then((result) => {
      if (cancelled) return;
      if (result) {
        setAccessToken(result.accessToken);
        setUser(result.user);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Login ─────────────────────────────────────────────────────────
  const login = useCallback(async (input: LoginInput) => {
    setIsLoginLoading(true);
    setLoginError(null);
    setLockedUntil(null);

    try {
      const result = await apiFetch<LoginResult>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });

      setAccessToken(result.accessToken);
      setUser(result.user);
      return result;
    } catch (err) {
      if (err instanceof ApiError) {
        setLoginError(err.message);

        // If locked, parse lockedUntil from extra data
        if (err.status === 423 && err.extra?.lockedUntil) {
          setLockedUntil(new Date(err.extra.lockedUntil as string));
        }
      } else {
        setLoginError("Terjadi kesalahan. Silakan coba lagi.");
      }
      throw err;
    } finally {
      setIsLoginLoading(false);
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the server call fails, clear local state
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  // ── Refresh access token ──────────────────────────────────────────
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const result = await apiFetch<RefreshResult>("/api/auth/refresh", {
        method: "POST",
      });
      setAccessToken(result.accessToken);
      setUser(result.user);
      return result.accessToken;
    } catch {
      // Refresh failed — user must log in again
      setAccessToken(null);
      setUser(null);
      return null;
    }
  }, []);

  // ── Dedicated function to update lockedUntil from raw response
  const setLockoutFromResponse = useCallback((lockedUntilStr: string) => {
    setLockedUntil(new Date(lockedUntilStr));
  }, []);

  return {
    accessToken,
    user,
    isLoading,
    isLoginLoading,
    loginError,
    lockedUntil,
    login,
    logout,
    refreshAccessToken,
    setLockoutFromResponse,
    isAuthenticated: !!accessToken && !!user,
  };
}
