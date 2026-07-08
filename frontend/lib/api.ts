// quick-260708-fr2: same-origin relative URLs, proxied to the backend by
// next.config.ts's rewrites(), so the httpOnly refreshToken cookie is
// FIRST-party (iOS Safari / Android browsers block cross-site cookies,
// which broke login/session-persistence on mobile). Only this file changes
// — every other file with its own API_BASE (uploads, images, offline queue)
// intentionally keeps the direct backend origin.
const API_BASE = "";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errBody = body?.error ?? {};
    // Extract extra fields (everything except code and message)
    const { code, message, ...extra } = errBody;
    throw new ApiError(
      res.status,
      code ?? "UNKNOWN",
      message ?? `Request failed with status ${res.status}`,
      extra,
    );
  }

  return res.json() as Promise<T>;
}

// Module-level promise to prevent concurrent refresh calls
let _refreshPromise: Promise<string | null> | null = null;

/**
 * Try to refresh the access token by calling POST /api/auth/refresh.
 * Uses httpOnly cookie (sent automatically with credentials: "include").
 */
async function tryRefreshToken(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return null;
      const body = await res.json();
      return body?.accessToken ?? null;
    } catch {
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

/** Convenience helper — calls apiFetch with an Authorization header. */
export async function authFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const doFetch = (token: string) =>
    apiFetch<T>(path, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
      },
    });

  try {
    return await doFetch(accessToken);
  } catch (err) {
    // If 401, try refreshing the token and retry once
    if (err instanceof ApiError && err.status === 401) {
      const newToken = await tryRefreshToken();
      if (newToken) {
        return doFetch(newToken);
      }
    }
    throw err;
  }
}
