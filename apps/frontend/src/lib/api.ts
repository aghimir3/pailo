import { getAccessToken } from "./auth";

const API_BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public field?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Type-safe fetch wrapper for Pailo API.
 * Automatically attaches auth token and handles errors.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string | number | boolean | undefined> }
): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`${API_BASE}${path}`, window.location.origin);

  if (options?.params) {
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { params: _, ...fetchOptions } = options ?? {};

  const res = await fetch(url.toString(), {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(fetchOptions?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(
      res.status,
      err.detail || "Request failed",
      err.code,
      err.field
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

/**
 * POST helper with JSON body.
 */
export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

/**
 * PATCH helper with JSON body.
 */
export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

/**
 * PUT helper with JSON body.
 */
export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });
}

/**
 * DELETE helper.
 */
export function apiDelete<T = void>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" });
}

/**
 * Fetch a blob (for PDF downloads, etc).
 */
export async function apiFetchBlob(path: string, options?: RequestInit): Promise<Blob> {
  const token = await getAccessToken();
  const url = new URL(`${API_BASE}${path}`, window.location.origin);

  const res = await fetch(url.toString(), {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, err.detail || "Request failed");
  }

  return res.blob();
}
