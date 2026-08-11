import { afterEach, describe, expect, it, vi } from "vitest";

const cookieStore = { get: vi.fn(), delete: vi.fn(), set: vi.fn() };
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));
vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ portalFetch: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  setSessionCookies: vi.fn(),
  setUserCookie: vi.fn(),
  addToVault: vi.fn(),
  removeFromVault: vi.fn(),
  readAccounts: vi.fn(),
  getRefreshToken: vi.fn(),
}));

import { callWithAuth } from "@/lib/api/authed";
import { portalFetch } from "@/lib/api/client";
import {
  addToVault,
  getRefreshToken,
  readAccounts,
  removeFromVault,
  setSessionCookies,
} from "@/lib/auth/session";

import {
  activateRefreshToken,
  establishSession,
  promoteVaultedAccount,
  revokeVaultedAccount,
} from "./accounts";

const tokens = {
  access_token: "a",
  refresh_token: "r",
  token_type: "Bearer",
  expires_in: 900,
};

function apiResponse<T>(ok: boolean, data: T) {
  return { ok, status: ok ? 200 : 401, data };
}

afterEach(() => vi.clearAllMocks());

describe("establishSession", () => {
  it("just activates the session when not adding an account", async () => {
    cookieStore.get.mockReturnValue(undefined);
    vi.mocked(callWithAuth).mockResolvedValue(
      apiResponse(true, { user: { id: 1, name: "Me", email: "me@x.co" } }),
    );

    await establishSession(tokens, 1);

    expect(setSessionCookies).toHaveBeenCalledWith(tokens);
    expect(removeFromVault).toHaveBeenCalledWith(1);
    expect(addToVault).not.toHaveBeenCalled(); // no prior-account capture
    // Seeds the display cookie for the newly-active account (no prior-account capture call).
    expect(callWithAuth).toHaveBeenCalledWith({ path: "/account" });
  });

  it("vaults the previously-active account when adding, then clears the flag", async () => {
    cookieStore.get.mockReturnValue({ value: "1" });
    vi.mocked(callWithAuth).mockResolvedValue(
      apiResponse(true, { user: { id: 9, name: "Prev", email: "p@x.co" } }),
    );
    vi.mocked(getRefreshToken).mockResolvedValue("rp");

    await establishSession(tokens, 1);

    expect(addToVault).toHaveBeenCalledWith({
      id: 9,
      name: "Prev",
      email: "p@x.co",
      refresh_token: "rp",
    });
    expect(setSessionCookies).toHaveBeenCalledWith(tokens);
    expect(removeFromVault).toHaveBeenCalledWith(1);
    expect(cookieStore.delete).toHaveBeenCalled();
  });

  it("does not vault when re-adding the account that's already active", async () => {
    cookieStore.get.mockReturnValue({ value: "1" });
    vi.mocked(callWithAuth).mockResolvedValue(
      apiResponse(true, { user: { id: 1, name: "Same", email: "s@x.co" } }),
    );
    vi.mocked(getRefreshToken).mockResolvedValue("rr");

    await establishSession(tokens, 1);

    expect(addToVault).not.toHaveBeenCalled();
  });
});

describe("activateRefreshToken", () => {
  it("activates the session on a good refresh", async () => {
    vi.mocked(portalFetch).mockResolvedValue(apiResponse(true, tokens));

    expect(await activateRefreshToken("r")).toBe(true);
    expect(setSessionCookies).toHaveBeenCalledWith(tokens);
  });

  it("returns false on a dead token and touches no cookies", async () => {
    vi.mocked(portalFetch).mockResolvedValue(apiResponse(false, {}));

    expect(await activateRefreshToken("r")).toBe(false);
    expect(setSessionCookies).not.toHaveBeenCalled();
  });
});

describe("revokeVaultedAccount", () => {
  it("refreshes then logs the account out", async () => {
    vi.mocked(portalFetch)
      .mockResolvedValueOnce(apiResponse(true, tokens))
      .mockResolvedValueOnce(apiResponse(true, {}));

    await revokeVaultedAccount("r");

    expect(portalFetch).toHaveBeenCalledTimes(2);
  });

  it("does nothing when the token is already dead", async () => {
    vi.mocked(portalFetch).mockResolvedValue(apiResponse(false, {}));

    await revokeVaultedAccount("r");

    expect(portalFetch).toHaveBeenCalledTimes(1);
  });
});

describe("promoteVaultedAccount", () => {
  it("activates the newest valid vaulted account and returns its user", async () => {
    vi.mocked(readAccounts).mockResolvedValue([
      { id: 2, name: "Grace", email: "g@x.co", refresh_token: "r2" },
    ]);
    // activateRefreshToken → the refresh call succeeds and mints a new pair.
    vi.mocked(portalFetch).mockResolvedValue(apiResponse(true, tokens));
    // The follow-up /account read returns the promoted account's user.
    vi.mocked(callWithAuth).mockResolvedValue(
      apiResponse(true, { user: { id: 2, name: "Grace", email: "g@x.co" } }),
    );

    const result = await promoteVaultedAccount();

    expect(result).toMatchObject({ id: 2, name: "Grace" });
    expect(setSessionCookies).toHaveBeenCalledWith(tokens);
    expect(removeFromVault).toHaveBeenCalledWith(2);
  });

  it("drops dead vaulted tokens and returns null when none activate", async () => {
    vi.mocked(readAccounts).mockResolvedValue([
      { id: 2, name: "Grace", email: "g@x.co", refresh_token: "dead" },
    ]);
    vi.mocked(portalFetch).mockResolvedValue(apiResponse(false, {}));

    const result = await promoteVaultedAccount();

    expect(result).toBeNull();
    expect(removeFromVault).toHaveBeenCalledWith(2);
    expect(setSessionCookies).not.toHaveBeenCalled();
  });
});
