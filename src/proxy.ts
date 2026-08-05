import { NextResponse, type NextRequest } from "next/server";

import { ADD_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";

/** The only routes reachable without a session. Everything else is gated. */
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/magic-link",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** Routes reachable in ANY auth state — never gated, never redirected away (e.g. legal pages). */
// Reachable in ANY auth state — never gated, never bounced. `/` is the Facebook-style home
// (landing when logged out, social when logged in); the legal pages are public documents.
const OPEN_PATHS = ["/", "/terms", "/privacy"];

function isOpenPath(pathname: string): boolean {
  return OPEN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Auth gate (Next.js "proxy", formerly "middleware"). Runs on every request
 * except API routes, Next internals, and static assets (see `config.matcher`).
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Legal pages are readable in any state — skip both the auth gate and the authed→home bounce.
  if (isOpenPath(pathname)) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(REFRESH_COOKIE);
  const publicPath = isPublicPath(pathname);
  // "Add another account" lets a signed-in user walk the whole auth flow (login OR
  // register → verify-email) to add a second session, instead of bouncing home.
  const addingAccount = request.cookies.has(ADD_COOKIE) && publicPath;

  // Unauthenticated visitor hitting a protected route → send them to sign-in,
  // remembering where they were headed.
  if (!hasSession && !publicPath) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }

  // Already-authenticated visitor hitting an auth page → send them home, unless
  // they're deliberately adding another account.
  if (hasSession && publicPath && !addingAccount) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
