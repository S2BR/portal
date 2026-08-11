import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { AuthUser } from "@/lib/api/types";
import { promoteVaultedAccount } from "@/lib/auth/accounts";
import { clearSessionCookies, getRefreshToken } from "@/lib/auth/session";

/**
 * BFF "current user" handler. Runs `callWithAuth`, so an expired access token is transparently
 * refreshed (and the rotated cookie re-set) here — which is why the browser reads the user through
 * this route rather than during a render.
 *
 * Failure is triaged so a transient blip never signs the user out:
 * - `callWithAuth` clears the session cookies ONLY on a definitive 401 (the refresh token is
 *   invalid/expired/revoked). If they're still present, this was transient (a 5xx / upstream
 *   hiccup): report a soft 503 and keep the session so the client retries instead of logging out.
 * - When the active account is truly gone, fall back to another signed-in account from the vault
 *   (multi-account) so one expired session doesn't sign the visitor out of everything.
 * - Only when there's nothing to fall back to do we finalize the sign-out with a 401. We clear the
 *   cookies first so the middleware (which treats the refresh cookie as "authenticated") doesn't
 *   bounce a `/login` redirect back to `/` in a loop.
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ user: AuthUser }>({ path: "/account" });

  if (response.ok) {
    return NextResponse.json({ user: response.data.user });
  }

  // Session cookies still present → the failure was transient, not a dead refresh token.
  if ((await getRefreshToken()) !== undefined) {
    return NextResponse.json({ user: null }, { status: 503 });
  }

  const promoted = await promoteVaultedAccount();
  if (promoted) {
    return NextResponse.json({ user: promoted });
  }

  await clearSessionCookies();
  return NextResponse.json({ user: null }, { status: 401 });
}
