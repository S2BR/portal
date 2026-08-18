import { NextResponse } from "next/server";

import { promoteVaultedAccount } from "@/lib/auth/accounts";

/**
 * BFF: the active session is gone but the switcher vault still holds other signed-in accounts. The
 * middleware sends a protected navigation here instead of straight to `/login`, so we activate the
 * most-recent still-valid vaulted account (which also leaves a one-shot notice for the UI to toast)
 * and bounce back to where the user was headed. If nothing can be activated, fall through to sign-in.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const nextParam = new URL(request.url).searchParams.get("next");
  // Only same-origin absolute paths — never an open redirect.
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/portal";

  const promoted = await promoteVaultedAccount();
  if (promoted) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const login = new URL("/login", request.url);
  if (next !== "/") {
    login.searchParams.set("next", next);
  }
  return NextResponse.redirect(login);
}
