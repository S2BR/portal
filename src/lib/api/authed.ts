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
 * In-flight refresh calls, keyed by the presented refresh token. A page often fires several authed
 * BFF calls at once; when the access token has expired, each would otherwise try to rotate the SAME
 * single-use refresh token concurrently — the first wins and the rest are misread as reuse (a
 * spurious "no access" or a forced sign-out). Single-flighting collapses them to one rotation whose
 * result every concurrent caller reuses. Keyed by the token so only the same account's simultaneous
 * calls share, and cleared as soon as the call settles (this is a short-lived de-dupe, not a cache).
 */
const inFlightRefreshes = new Map<string, Promise<PortalResponse<TokenPair>>>();

function refreshTokenPair(
  refreshToken: string,
): Promise<PortalResponse<TokenPair>> {
  const existing = inFlightRefreshes.get(refreshToken);
  if (existing) {
    return existing;
  }

  const request = portalFetch<TokenPair>({
    method: "POST",
    path: "/auth/refresh",
    body: { refresh_token: refreshToken },
  }).finally(() => {
    inFlightRefreshes.delete(refreshToken);
  });

  inFlightRefreshes.set(refreshToken, request);
  return request;
}

/**
 * Call the portal API with the current access token. On a 401 it refreshes once
 * (rotating the refresh cookie) and retries. Must run where cookies are
 * writable — a route handler or server action — not during a Server Component
 * render. Concurrent refreshes of the same token are single-flighted (see
 * {@link refreshTokenPair}), so a page firing several authed calls at once
 * rotates the token only once.
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

  const refreshed = await refreshTokenPair(refreshToken);

  if (!refreshed.ok) {
    // Only sign out on a DEFINITIVE auth failure: the API returns a generic 401 when the refresh
    // token is invalid / expired / revoked (including a detected reuse). A transient failure — a
    // 5xx, or a non-JSON fail-closed body (an upstream hiccup or a dev rebuild) — must NOT clear
    // the session, or the user is spuriously logged out AND the still-live token is abandoned as
    // an orphaned server session. Keep the cookies so the next attempt recovers.
    if (refreshed.status === 401) {
      await clearSessionCookies();
    }
    return first;
  }

  // A plain refresh is the SAME account — keep the display cookie so the header still renders the
  // user even if this (or a follow-up) call is throttled and `/me` can't repopulate it.
  await setSessionCookies(refreshed.data, { keepUserCookie: true });
  return portalFetch<T>({ ...request, token: refreshed.data.access_token });
}
