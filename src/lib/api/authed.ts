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
 * In-flight refresh calls, keyed by the presented refresh token — collapses refreshes that OVERLAP
 * in time (a page firing several authed calls at once) to a single rotation.
 */
const inFlightRefreshes = new Map<string, Promise<PortalResponse<TokenPair>>>();

/**
 * Recently-completed SUCCESSFUL refreshes, keyed by the token that was rotated. Overlap de-duping
 * alone isn't enough: refresh tokens are single-use, and each browser BFF call is a SEPARATE request
 * that carries whatever cookie it was sent with — so a call that was sent with token R but only
 * reaches the refresh step AFTER a concurrent call already rotated R (e.g. because its own request
 * ran slow) would replay R to the API. The server treats that as reuse once past its short grace
 * window and burns the whole session family — a spurious full sign-out. Caching the result briefly
 * lets that straggler reuse the rotation instead of replaying R, so the API never sees the reuse.
 */
const recentRefreshes = new Map<
  string,
  { at: number; result: PortalResponse<TokenPair> }
>();

/** How long a completed rotation stays reusable by a straggler carrying the pre-rotation token. */
const RECENT_REFRESH_TTL_MS = 60_000;

/** Test-only: clear the in-memory refresh coordination between cases (the maps are module state). */
export function __resetRefreshCoordinationForTests(): void {
  inFlightRefreshes.clear();
  recentRefreshes.clear();
}

function refreshTokenPair(
  refreshToken: string,
): Promise<PortalResponse<TokenPair>> {
  const existing = inFlightRefreshes.get(refreshToken);
  if (existing) {
    return existing;
  }

  // A straggler still carrying the just-rotated token: reuse the rotation rather than replay it.
  const recent = recentRefreshes.get(refreshToken);
  if (recent && Date.now() - recent.at < RECENT_REFRESH_TTL_MS) {
    return Promise.resolve(recent.result);
  }

  const request = portalFetch<TokenPair>({
    method: "POST",
    path: "/auth/refresh",
    body: { refresh_token: refreshToken },
  })
    .then((result) => {
      if (result.ok) {
        recentRefreshes.set(refreshToken, { at: Date.now(), result });
        // Drop expired entries so the map can't grow unbounded.
        for (const [key, entry] of recentRefreshes) {
          if (Date.now() - entry.at >= RECENT_REFRESH_TTL_MS) {
            recentRefreshes.delete(key);
          }
        }
      }
      return result;
    })
    .finally(() => {
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
