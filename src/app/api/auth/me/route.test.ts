import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({
  callWithAuth: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ clearSessionCookies: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";
import { clearSessionCookies } from "@/lib/auth/session";

import { GET } from "./route";

const user = {
  id: 1,
  name: "Ada",
  email: "ada@example.com",
  timezone: null,
  two_factor_enabled: false,
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
  });

  it("returns 401 with a null user when unauthenticated", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 401,
      data: {},
    });

    const res = await GET();

    expect(res.status).toBe(401);
    expect((await res.json()).user).toBeNull();
    // The stale cookies are cleared so the proxy stops treating the visitor as authenticated
    // (otherwise a /login redirect bounces back to / forever).
    expect(clearSessionCookies).toHaveBeenCalledOnce();
  });
});
