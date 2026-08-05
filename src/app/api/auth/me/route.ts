import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { AuthUser } from "@/lib/api/types";
import { clearSessionCookies } from "@/lib/auth/session";

/**
 * BFF "current user" handler. Runs `callWithAuth`, so an expired access token is
 * transparently refreshed (and the rotated cookie re-set) here — which is why
 * the browser reads the user through this route rather than during a render.
 *
 * If the session can't be validated (the refresh token is dead too), we CLEAR the cookies
 * before answering 401. Otherwise the stale refresh cookie keeps the proxy treating the visitor
 * as authenticated, so a client redirect to /login bounces back to / — an infinite loop.
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ user: AuthUser }>({
    path: "/account",
  });

  if (response.ok) {
    return NextResponse.json({ user: response.data.user });
  }

  await clearSessionCookies();
  return NextResponse.json({ user: null }, { status: 401 });
}
