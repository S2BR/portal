import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADD_COOKIE } from "@/lib/auth/cookies";
import { getRefreshToken } from "@/lib/auth/session";

/**
 * BFF: begin adding another account. Sets a short-lived flag so the proxy lets the
 * already-signed-in user reach `/login`, and the login handler vaults the current
 * account instead of replacing it. Only meaningful with a live session.
 */
export async function POST(): Promise<NextResponse> {
  if (!(await getRefreshToken())) {
    return NextResponse.json({ status: "no_session" }, { status: 401 });
  }

  (await cookies()).set(ADD_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes to complete the sign-in
  });

  return NextResponse.json({ status: "ok" });
}
