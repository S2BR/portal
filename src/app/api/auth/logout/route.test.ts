import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getAccessToken: vi.fn().mockResolvedValue("access"),
  getRefreshToken: vi.fn().mockResolvedValue("refresh"),
  readAccounts: vi.fn().mockResolvedValue([]),
  writeAccounts: vi.fn(),
  clearSessionCookies: vi.fn(),
  clearAccounts: vi.fn(),
}));
vi.mock("@/lib/auth/accounts", () => ({
  activateRefreshToken: vi.fn(),
  revokeVaultedAccount: vi.fn(),
}));

import {
  activateRefreshToken,
  revokeVaultedAccount,
} from "@/lib/auth/accounts";
import {
  clearAccounts,
  clearSessionCookies,
  readAccounts,
} from "@/lib/auth/session";

import { POST } from "./route";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function request(scope?: "current" | "all"): Request {
  return new Request("http://localhost/api/auth/logout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(scope ? { scope } : {}),
  });
}

const account = { id: 2, name: "B", email: "b@x.co", refresh_token: "rb" };

afterEach(() => {
  fetchMock.mockReset();
  vi.clearAllMocks();
});

describe("POST /api/auth/logout", () => {
  it("signs out fully when no other accounts remain", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    vi.mocked(readAccounts).mockResolvedValue([]);

    const res = await POST(request("current"));

    expect((await res.json()).status).toBe("signed_out");
    expect(clearSessionCookies).toHaveBeenCalledTimes(1);
  });

  it("drops to the next account when one is still signed in", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    vi.mocked(readAccounts).mockResolvedValue([account]);
    vi.mocked(activateRefreshToken).mockResolvedValue(true);

    const res = await POST(request("current"));

    expect((await res.json()).status).toBe("switched");
    expect(activateRefreshToken).toHaveBeenCalledWith("rb");
    expect(clearSessionCookies).not.toHaveBeenCalled();
  });

  it("scope=all revokes every account and clears everything", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    vi.mocked(readAccounts).mockResolvedValue([account]);

    const res = await POST(request("all"));

    expect((await res.json()).status).toBe("signed_out");
    expect(revokeVaultedAccount).toHaveBeenCalledWith("rb");
    expect(clearAccounts).toHaveBeenCalledTimes(1);
    expect(clearSessionCookies).toHaveBeenCalledTimes(1);
  });
});
