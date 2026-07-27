import { NextResponse } from "next/server";

import { portalFetch } from "@/lib/api/client";
import {
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
} from "@/lib/auth/session";

/**
 * BFF logout handler. Best-effort revokes the session on the portal (blacklist
 * the access token + burn the refresh family), then always clears our cookies.
 */
export async function POST(): Promise<NextResponse> {
  const [accessToken, refreshToken] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
  ]);

  if (accessToken || refreshToken) {
    await portalFetch({
      method: "POST",
      path: "/auth/logout",
      token: accessToken,
      body: refreshToken ? { refresh_token: refreshToken } : undefined,
    }).catch(() => undefined);
  }

  await clearSessionCookies();
  return NextResponse.json({ status: "ok" });
}
