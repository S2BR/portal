import "server-only";

import { cookies } from "next/headers";

import { callWithAuth } from "@/lib/api/authed";
import { portalFetch } from "@/lib/api/client";
import type { AuthUser, TokenPair } from "@/lib/api/types";

import { ADD_COOKIE } from "./cookies";
import {
  addToVault,
  getRefreshToken,
  readAccounts,
  removeFromVault,
  setSessionCookies,
  setSessionNotice,
  setUserCookie,
  withCurrentRoles,
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

  // Seed the display cookie for the newly-active account so the post-login full reload renders the
  // header immediately, instead of showing a skeleton until the background /me returns.
  const me = await callWithAuth<{ user: AuthUser }>({ path: "/account" });
  if (me.ok) {
    await setUserCookie(await withCurrentRoles(me.data.user));
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
 * When the active session is definitively gone, fall back to the switcher vault: activate the most
 * recently-used still-valid vaulted account and return its user, so one account's expired/revoked
 * session doesn't sign the visitor out entirely (the OTHER account stays logged in). Dead vaulted
 * tokens are dropped as they're tried. Returns null when no vaulted account can be activated.
 */
export async function promoteVaultedAccount(): Promise<AuthUser | null> {
  // Newest last in the vault, so try from the end — the most recently used account first.
  for (const account of (await readAccounts()).slice().reverse()) {
    if (await activateRefreshToken(account.refresh_token)) {
      await removeFromVault(account.id);
      const me = await callWithAuth<{ user: AuthUser }>({ path: "/account" });
      if (me.ok) {
        const user = await withCurrentRoles(me.data.user);
        await setUserCookie(user);
        // The active session ended unexpectedly and we fell back to this account — leave a notice so
        // the UI can tell the user what happened instead of silently swapping who's signed in.
        await setSessionNotice({
          kind: "account_fallback",
          account: user.name,
        });
        return user;
      }
      // Activated (tokens are valid) but the immediate /account read hiccupped — the account is
      // now active, so stop here rather than churning through more of the vault.
      return null;
    }
    // A dead vaulted token — drop it so it isn't retried.
    await removeFromVault(account.id);
  }
  return null;
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

  const { id, name, email, avatar } = me.data.user;
  return { id, name, email, avatar, refresh_token: refreshToken };
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
