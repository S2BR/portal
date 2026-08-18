import "server-only";

import { cookies } from "next/headers";

import type { AuthUser, TokenPair } from "@/lib/api/types";

import {
  ACCESS_COOKIE,
  ACCOUNTS_COOKIE,
  ADMIN_COOKIE,
  REFRESH_COOKIE,
} from "./cookies";
import { encodeUser, USER_COOKIE } from "./user-cookie";
import { readVerifiedClaims, verifyAdminToken } from "./verify-token";
import { verifyAccessToken } from "./verify-token";

const USER_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days; overwritten on each session change

const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
/** Most signed-in accounts we keep in the switcher (bounds the cookie size). */
const MAX_ACCOUNTS = 5;

/** One inactive account in the switcher vault: enough to render + reactivate it. */
export interface VaultAccount {
  id: number;
  name: string;
  email: string;
  refresh_token: string;
  /**
   * The account's avatar, captured while it was active — a short-lived presigned url, so it
   * may expire before the next switch (the switcher then falls back to initials). Refreshed
   * whenever the account is made active again.
   */
  avatar?: string | null;
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
export async function setSessionCookies(
  tokens: TokenPair,
  options: { keepUserCookie?: boolean } = {},
): Promise<void> {
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

  // Admin-panel session (see IssueAdminToken) — tied to the active account:
  // - a response that CARRIES an admin_token → (re)set the cookie, sliding the 1h window;
  // - no admin_token on a SAME-account refresh (keepUserCookie) → LEAVE any existing cookie, so a
  //   just-revoked admin's session rides out its remaining life (inert — the API blocks every action);
  // - no admin_token on an account CHANGE (login / switch / add) → CLEAR it, so the newly-active
  //   account only ever sees its own admin state.
  if (typeof tokens.admin_token === "string" && tokens.admin_token !== "") {
    try {
      await verifyAdminToken(tokens.admin_token);
      store.set(
        ADMIN_COOKIE,
        tokens.admin_token,
        cookieOptions(tokens.admin_expires_in ?? 3600),
      );
    } catch {
      // A malformed admin token must never gate the panel — drop any stale one.
      store.delete(ADMIN_COOKIE);
    }
  } else if (!options.keepUserCookie) {
    store.delete(ADMIN_COOKIE);
  }
  // The active account just changed (login / add / switch) — drop the stale display cookie so it
  // can't show the previous user; the next `/me` repopulates it for the new one. On a plain token
  // REFRESH (same account) the caller passes `keepUserCookie` so the header keeps rendering the user
  // from the cookie even when the follow-up call is throttled or briefly unavailable — otherwise a
  // refresh that races a 429 would blank the header on the next reload with nothing to reseed from.
  if (!options.keepUserCookie) {
    store.delete(USER_COOKIE);
  }
}

/**
 * Seed the non-httpOnly display cookie for the now-active account, so the header renders from it
 * immediately after a login/switch instead of waiting on the background `/me`. Holds no
 * credentials.
 */
export async function setUserCookie(user: AuthUser): Promise<void> {
  const store = await cookies();
  store.set(USER_COOKIE, encodeUser(user), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: USER_COOKIE_MAX_AGE,
  });
}

/**
 * The platform role names carried by the current access token (its verified `roles` claim), or an
 * empty list. Roles travel with the token — not the account payload — so the portal reads them the
 * same way the API does: off a signature-verified token, no extra round-trip. Never throws (a
 * missing/invalid token just yields no roles).
 */
export async function currentAccessTokenRoles(): Promise<string[]> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) {
    return [];
  }
  try {
    const claims = await readVerifiedClaims(token);
    return Array.isArray(claims.roles)
      ? claims.roles.filter((role): role is string => typeof role === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * Whether a live admin-panel session is present — a valid, unexpired admin token in the cookie. This
 * gates the admin UI; it survives the 15-minute access token's expiry (its whole purpose) and is
 * independent of it. Never throws. Real authorization of any admin action is still the API's job.
 */
export async function adminSessionActive(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) {
    return false;
  }
  try {
    await verifyAdminToken(token);
    return true;
  } catch {
    return false;
  }
}

/** Return the user with the current token's roles attached, for the display cookie / `/me` reply. */
export async function withCurrentRoles(user: AuthUser): Promise<AuthUser> {
  return { ...user, roles: await currentAccessTokenRoles() };
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(USER_COOKIE);
  store.delete(ADMIN_COOKIE);
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
