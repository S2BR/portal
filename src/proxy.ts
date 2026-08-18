import { NextResponse, type NextRequest } from "next/server";

import {
  ACCOUNTS_COOKIE,
  ADD_COOKIE,
  REFRESH_COOKIE,
} from "@/lib/auth/cookies";

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
// (landing when logged out, social when logged in); the legal pages are public documents; the
// public business directory + profile pages (`/businesses`, `/businesses/<slug>`) must be readable
// (and crawlable) by anyone; the generated social card must be fetchable by crawlers (no session).
// (`sitemap.xml`/`robots.txt` carry a dot, so the matcher below already skips them.)
const OPEN_PATHS = [
  "/",
  "/businesses",
  "/terms",
  "/privacy",
  "/opengraph-image",
];

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

  // No active session on a protected route. If OTHER accounts are still signed in (the switcher
  // vault), fall back to one of them instead of forcing a re-login — the promote route activates it
  // and bounces back here. Otherwise send them to sign-in, remembering where they were headed.
  if (!hasSession && !publicPath) {
    if (request.cookies.has(ACCOUNTS_COOKIE)) {
      const promote = new URL("/api/auth/promote", request.url);
      promote.searchParams.set("next", pathname);
      return NextResponse.redirect(promote);
    }
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
