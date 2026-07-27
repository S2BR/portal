import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { AuthUser } from "@/lib/api/types";

/**
 * BFF "current user" handler. Runs `callWithAuth`, so an expired access token is
 * transparently refreshed (and the rotated cookie re-set) here — which is why
 * the browser reads the user through this route rather than during a render.
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ user: AuthUser }>({ path: "/auth/me" });

  if (response.ok) {
    return NextResponse.json({ user: response.data.user });
  }

  return NextResponse.json({ user: null }, { status: 401 });
}
