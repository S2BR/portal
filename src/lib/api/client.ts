import "server-only";

import { env } from "@/env";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface PortalRequest {
  path: string;
  method?: HttpMethod;
  body?: unknown;
  token?: string;
  locale?: string;
}

export interface PortalResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

/**
 * Low-level call to the portal API. Server-only — never import from a client
 * component. Returns the status so callers can branch on the auth flow's
 * `status` discriminators (a 403 `two_factor_required` is a next step, not an
 * error); it does not throw on non-2xx responses.
 */
export async function portalFetch<T = unknown>(
  request: PortalRequest,
): Promise<PortalResponse<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (request.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (request.token) {
    headers.Authorization = `Bearer ${request.token}`;
  }
  if (request.locale) {
    headers["Accept-Language"] = request.locale;
  }

  const response = await fetch(`${env.PORTAL_API_URL}${request.path}`, {
    method: request.method ?? "GET",
    headers,
    body: request.body !== undefined ? JSON.stringify(request.body) : undefined,
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as T;

  return { ok: response.ok, status: response.status, data };
}
