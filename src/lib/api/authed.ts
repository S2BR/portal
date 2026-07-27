import "server-only";

import {
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
  setSessionCookies,
} from "@/lib/auth/session";

import { portalFetch, type PortalRequest, type PortalResponse } from "./client";
import type { TokenPair } from "./types";

/**
 * Call the portal API with the current access token. On a 401 it refreshes once
 * (rotating the refresh cookie) and retries. Must run where cookies are
 * writable — a route handler or server action — not during a Server Component
 * render. Single-flight is not enforced across concurrent requests; the
 * portal's refresh grace window absorbs the occasional race.
 */
export async function callWithAuth<T = unknown>(
  request: Omit<PortalRequest, "token">,
): Promise<PortalResponse<T>> {
  const accessToken = await getAccessToken();
  const first = await portalFetch<T>({ ...request, token: accessToken });

  if (first.status !== 401) {
    return first;
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearSessionCookies();
    return first;
  }

  const refreshed = await portalFetch<TokenPair>({
    method: "POST",
    path: "/auth/refresh",
    body: { refresh_token: refreshToken },
  });

  if (!refreshed.ok) {
    await clearSessionCookies();
    return first;
  }

  await setSessionCookies(refreshed.data);
  return portalFetch<T>({ ...request, token: refreshed.data.access_token });
}
