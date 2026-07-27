import { NextResponse, type NextRequest } from "next/server";

import { REFRESH_COOKIE } from "@/lib/auth/cookies";

/** The only routes reachable without a session. Everything else is gated. */
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Auth gate (Next.js "proxy", formerly "middleware"). Runs on every request
 * except API routes, Next internals, and static assets (see `config.matcher`).
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(REFRESH_COOKIE);
  const publicPath = isPublicPath(pathname);

  // Unauthenticated visitor hitting a protected route → send them to sign-in,
  // remembering where they were headed.
  if (!hasSession && !publicPath) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }

  // Already-authenticated visitor hitting an auth page → send them home.
  if (hasSession && publicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
