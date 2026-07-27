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
    return { ok: false, status: response.status, data: {} as T };
  }

  return { ok: response.ok, status: response.status, data };
}
