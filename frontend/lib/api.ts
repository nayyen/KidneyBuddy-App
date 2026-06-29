const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

/** Convenience helper — calls apiFetch with an Authorization header. */
export async function authFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  return apiFetch<T>(path, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
