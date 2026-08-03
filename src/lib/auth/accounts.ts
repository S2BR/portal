import "server-only";

import { cookies } from "next/headers";

import { callWithAuth } from "@/lib/api/authed";
import { portalFetch } from "@/lib/api/client";
import type { AuthUser, TokenPair } from "@/lib/api/types";

import { ADD_COOKIE } from "./cookies";
import {
  addToVault,
  getRefreshToken,
  removeFromVault,
  setSessionCookies,
  type VaultAccount,
} from "./session";

/**
 * Make `tokens` the active session — the single entry point every sign-in path uses, so
 * the switcher invariants always hold. In "add another account" mode the previously-active
 * account is moved to the vault first (and the add flag cleared); the newly-active account
 * is always removed from the vault, so an account is never both active and vaulted.
 */
export async function establishSession(
  tokens: TokenPair,
  newAccountId?: number,
): Promise<void> {
  const store = await cookies();
  const adding = store.get(ADD_COOKIE)?.value === "1";

  if (adding) {
    const previous = await captureActiveAccount();
    if (previous && previous.id !== newAccountId) {
      await addToVault(previous);
    }
    store.delete(ADD_COOKIE);
  }

  await setSessionCookies(tokens);

  if (newAccountId !== undefined) {
    await removeFromVault(newAccountId);
  }
}

/**
 * Refresh a vaulted (or promoted) refresh token and make that account the active
 * session. Rotates the token server-side (single-use) and re-verifies the new access
 * token's signature via {@link setSessionCookies}. Returns false if the token is dead.
 */
export async function activateRefreshToken(
  refreshToken: string,
): Promise<boolean> {
  const refreshed = await portalFetch<TokenPair>({
    method: "POST",
    path: "/auth/refresh",
    body: { refresh_token: refreshToken },
  });

  if (!refreshed.ok) {
    return false;
  }

  await setSessionCookies(refreshed.data);
  return true;
}

/**
 * Snapshot the currently-active account (its identity + current refresh token) so it can
 * be moved into the switcher vault. Uses {@link callWithAuth}, so an expired-but-valid
 * active session is refreshed first and the *rotated* refresh token is what's captured.
 * Null when there is no live active session.
 */
export async function captureActiveAccount(): Promise<VaultAccount | null> {
  const me = await callWithAuth<{ user: AuthUser }>({ path: "/account" });
  const refreshToken = await getRefreshToken();

  if (!me.ok || !refreshToken) {
    return null;
  }

  const { id, name, email } = me.data.user;
  return { id, name, email, refresh_token: refreshToken };
}

/**
 * Best-effort revoke a vaulted account server-side WITHOUT touching the active session.
 * `/auth/logout` needs a bearer token and a vaulted account only has a refresh token, so
 * we refresh it once to mint an access token, then revoke that family. Used by
 * "sign out of all accounts". Cookies are never written here.
 */
export async function revokeVaultedAccount(
  refreshToken: string,
): Promise<void> {
  const refreshed = await portalFetch<TokenPair>({
    method: "POST",
    path: "/auth/refresh",
    body: { refresh_token: refreshToken },
  });

  if (!refreshed.ok) {
    return;
  }

  await portalFetch({
    method: "POST",
    path: "/auth/logout",
    token: refreshed.data.access_token,
    body: { refresh_token: refreshed.data.refresh_token },
  }).catch(() => undefined);
}
