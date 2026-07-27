import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getAccessToken: vi.fn().mockResolvedValue("access"),
  getRefreshToken: vi.fn().mockResolvedValue("refresh"),
  clearSessionCookies: vi.fn(),
}));

import { clearSessionCookies } from "@/lib/auth/session";

import { POST } from "./route";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  fetchMock.mockReset();
  vi.clearAllMocks();
});

describe("POST /api/auth/logout", () => {
  it("revokes on the portal and clears the session cookies", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    const res = await POST();

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(clearSessionCookies).toHaveBeenCalledTimes(1);
  });

  it("clears cookies even when the portal call fails", async () => {
    fetchMock.mockRejectedValue(new Error("network"));

    const res = await POST();

    expect(res.status).toBe(200);
    expect(clearSessionCookies).toHaveBeenCalledTimes(1);
  });
});
