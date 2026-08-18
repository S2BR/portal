import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({
  callWithAuth: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  clearSessionCookies: vi.fn(),
  getRefreshToken: vi.fn(),
  withCurrentRoles: vi.fn(async (user) => user),
}));
vi.mock("@/lib/auth/accounts", () => ({
  promoteVaultedAccount: vi.fn(),
}));

import { callWithAuth } from "@/lib/api/authed";
import { promoteVaultedAccount } from "@/lib/auth/accounts";
import { clearSessionCookies, getRefreshToken } from "@/lib/auth/session";

import { GET } from "./route";

const user = {
  id: 1,
  name: "Ada",
  email: "ada@example.com",
  timezone: null,
  avatar: null,
  two_factor_enabled: false,
  date_of_birth: null,
  gender: null,
  created_at: "2026-01-01T00:00:00.000000Z",
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/me", () => {
  it("returns the user when authenticated", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { user },
    });

    const res = await GET();
    const body = (await res.json()) as { user: { id: number; name: string } };

    expect(res.status).toBe(200);
    expect(body.user).toMatchObject({ id: 1, name: "Ada" });
    expect(clearSessionCookies).not.toHaveBeenCalled();
  });

  it("reports a soft 503 (keeps the session) on a transient failure", async () => {
    // The active session is unverifiable but its cookies are still present → transient, not a dead
    // refresh token. Must NOT clear or promote — the client retries.
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 503,
      data: {},
    });
    vi.mocked(getRefreshToken).mockResolvedValue("refresh-still-here");

    const res = await GET();

    expect(res.status).toBe(503);
    expect((await res.json()).user).toBeNull();
    expect(clearSessionCookies).not.toHaveBeenCalled();
    expect(promoteVaultedAccount).not.toHaveBeenCalled();
  });

  it("falls back to a vaulted account when the active session is definitively gone", async () => {
    // callWithAuth cleared the cookies (definitive 401), so getRefreshToken is undefined; a vaulted
    // account is promoted and returned instead of signing the visitor out.
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 401,
      data: {},
    });
    vi.mocked(getRefreshToken).mockResolvedValue(undefined);
    vi.mocked(promoteVaultedAccount).mockResolvedValue({
      ...user,
      id: 2,
      name: "Grace",
    });

    const res = await GET();
    const body = (await res.json()) as { user: { id: number; name: string } };

    expect(res.status).toBe(200);
    expect(body.user).toMatchObject({ id: 2, name: "Grace" });
    expect(clearSessionCookies).not.toHaveBeenCalled();
  });

  it("returns 401 and clears when the active session is gone and the vault is empty", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 401,
      data: {},
    });
    vi.mocked(getRefreshToken).mockResolvedValue(undefined);
    vi.mocked(promoteVaultedAccount).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect((await res.json()).user).toBeNull();
    // The stale cookies are cleared so the proxy stops treating the visitor as authenticated
    // (otherwise a /login redirect bounces back to / forever).
    expect(clearSessionCookies).toHaveBeenCalledOnce();
  });
});
