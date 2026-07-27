import "server-only";

import { cookies } from "next/headers";

import type { TokenPair } from "@/lib/api/types";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "./cookies";
import { verifyAccessToken } from "./verify-token";

const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Persist the token pair in httpOnly cookies. Only callable where cookies are
 * writable — a route handler or server action — not during a render.
 */
export async function setSessionCookies(tokens: TokenPair): Promise<void> {
  // Defense in depth: never mint a session from a response that lacks a real
  // token pair (e.g. a non-JSON 200 that slipped through). Fail closed.
  if (
    typeof tokens?.access_token !== "string" ||
    tokens.access_token === "" ||
    typeof tokens?.refresh_token !== "string" ||
    tokens.refresh_token === "" ||
    typeof tokens?.expires_in !== "number"
  ) {
    throw new Error("Refusing to set a session without a valid token pair.");
  }

  // The decisive check: only establish a session from a token the portal
  // actually signed. Verifying the RS256 signature against our pinned public
  // key (plus audience/issuer/expiry) means a forged, tampered, MITM'd, or
  // misrouted response — even one that mimics a 200 + JSON — cannot mint a
  // session. Throws → the caller fails closed and no cookie is written.
  await verifyAccessToken(tokens.access_token);

  const store = await cookies();
  store.set(
    ACCESS_COOKIE,
    tokens.access_token,
    cookieOptions(tokens.expires_in),
  );
  store.set(
    REFRESH_COOKIE,
    tokens.refresh_token,
    cookieOptions(REFRESH_MAX_AGE_SECONDS),
  );
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}
