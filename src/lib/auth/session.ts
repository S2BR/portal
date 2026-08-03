import "server-only";

import { cookies } from "next/headers";

import type { TokenPair } from "@/lib/api/types";

import { ACCESS_COOKIE, ACCOUNTS_COOKIE, REFRESH_COOKIE } from "./cookies";
import { verifyAccessToken } from "./verify-token";

const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
/** Most signed-in accounts we keep in the switcher (bounds the cookie size). */
const MAX_ACCOUNTS = 5;

/** One inactive account in the switcher vault: enough to render + reactivate it. */
export interface VaultAccount {
  id: number;
  name: string;
  email: string;
  refresh_token: string;
}

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

/**
 * The switcher "vault" — the inactive accounts (never the active one, whose refresh
 * token rotates in {@link REFRESH_COOKIE}). Malformed cookies read as an empty list.
 */
export async function readAccounts(): Promise<VaultAccount[]> {
  const raw = (await cookies()).get(ACCOUNTS_COOKIE)?.value;
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry): entry is VaultAccount =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as VaultAccount).id === "number" &&
        typeof (entry as VaultAccount).refresh_token === "string",
    );
  } catch {
    return [];
  }
}

export async function writeAccounts(accounts: VaultAccount[]): Promise<void> {
  const store = await cookies();
  if (accounts.length === 0) {
    store.delete(ACCOUNTS_COOKIE);
    return;
  }
  store.set(
    ACCOUNTS_COOKIE,
    JSON.stringify(accounts.slice(0, MAX_ACCOUNTS)),
    cookieOptions(REFRESH_MAX_AGE_SECONDS),
  );
}

/** Add (or refresh) an account in the vault — dedup by id, newest last, capped. */
export async function addToVault(entry: VaultAccount): Promise<void> {
  const others = (await readAccounts()).filter((a) => a.id !== entry.id);
  // Keep the most recent MAX_ACCOUNTS; drop the oldest (front) if over.
  await writeAccounts([...others, entry].slice(-MAX_ACCOUNTS));
}

export async function removeFromVault(id: number): Promise<VaultAccount[]> {
  const remaining = (await readAccounts()).filter((a) => a.id !== id);
  await writeAccounts(remaining);
  return remaining;
}

export async function clearAccounts(): Promise<void> {
  (await cookies()).delete(ACCOUNTS_COOKIE);
}
