import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { DELETE } from "./route";

function context(family: string): { params: Promise<{ family: string }> } {
  return { params: Promise.resolve({ family }) };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/auth/sessions/[family]", () => {
  it("revokes a session by family id", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {},
    });

    const res = await DELETE(
      new Request("http://localhost"),
      context("fam-42"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "DELETE",
      path: "/account/security/sessions/fam-42",
    });
  });

  it("maps an unknown session to 404", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 404,
      data: {},
    });

    const res = await DELETE(new Request("http://localhost"), context("nope"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ status: "not_found" });
  });
});
