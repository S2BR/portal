import "server-only";

import { cookies } from "next/headers";

import { env } from "@/env";
import { isLocale, LOCALE_COOKIE, toApiLocale } from "@/i18n/config";

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
  /**
   * Set only when the API response body was not valid JSON (a failed-closed
   * call — e.g. an HTML outage page or a mispointed `PORTAL_API_URL`). Holds a
   * short snippet of the raw body so callers can surface a real diagnostic
   * instead of masking it as a generic error.
   */
  nonJson?: string;
}

/**
 * The portal-format locale (e.g. `fr_CA`) from the visitor's cookie, if set.
 * Forwarded as `Accept-Language` so the portal localizes its response messages.
 */
async function requestApiLocale(): Promise<string | undefined> {
  try {
    const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
    return isLocale(cookieLocale) ? toApiLocale(cookieLocale) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Low-level call to the portal API. Server-only — never import from a client
 * component. Returns the status so callers can branch on the auth flow's
 * `status` discriminators; it does not throw on non-2xx responses.
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
  const acceptLanguage = request.locale ?? (await requestApiLocale());
  if (acceptLanguage) {
    headers["Accept-Language"] = acceptLanguage;
  }

  const response = await fetch(`${env.PORTAL_API_URL}${request.path}`, {
    method: request.method ?? "GET",
    headers,
    body: request.body !== undefined ? JSON.stringify(request.body) : undefined,
    cache: "no-store",
  });

  // The portal API always speaks JSON. Read the body as text and parse it
  // ourselves so a 2xx carrying a non-JSON payload is never mistaken for a
  // successful API call — e.g. an HTML outage page, or a PORTAL_API_URL that
  // (mis)points at the web app itself, which would otherwise let the auth
  // handlers mint a session from an empty body. Such a response fails closed.
  const raw = await response.text();
  let data: T;
  try {
    data = (raw === "" ? {} : JSON.parse(raw)) as T;
  } catch {
    // Surface the fail-closed event in server logs (e.g. Vercel functions) — a
    // non-JSON body almost always means an upstream outage or a mispointed
    // PORTAL_API_URL, and is otherwise invisible.
    console.error(
      `[portalFetch] non-JSON response from ${request.method ?? "GET"} ${request.path} (HTTP ${response.status}): ${raw.slice(0, 200)}`,
    );
    return {
      ok: false,
      status: response.status,
      data: {} as T,
      nonJson: raw.slice(0, 300),
    };
  }

  return { ok: response.ok, status: response.status, data };
}

/**
 * The best human-facing error text for a failed portal call: the API's own
 * (localized) message when it sent one, otherwise an honest diagnostic naming
 * the HTTP status — and flagging a non-JSON body — so a failure is never masked
 * as a bare generic error.
 */
export function portalErrorMessage(
  response: PortalResponse<{ message?: string }>,
): string {
  if (response.data.message) {
    return response.data.message;
  }
  if (response.nonJson !== undefined) {
    return `The API returned a non-JSON response (HTTP ${response.status}).`;
  }
  return `The API returned an unexpected error (HTTP ${response.status}).`;
}
