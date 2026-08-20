import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { DELETE } from "./route";

function request(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/uploads/avatar", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function context(type: string) {
  return { params: Promise.resolve({ type }) };
}

const user = { id: 1, name: "Ada", avatar: "https://cdn.test/1/x.jpg" };

afterEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/uploads/[type] (remove)", () => {
  it("removes the current object and returns the payload", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { user: { ...user, avatar: null } },
    });

    const res = await DELETE(request("DELETE"), context("avatar"));

    expect(res.status).toBe(200);
    expect((await res.json()).user.avatar).toBeNull();
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "DELETE",
      path: "/uploads/avatar",
    });
  });

  it("rejects a malformed type without calling the portal", async () => {
    const res = await DELETE(request("DELETE"), context("Avatar!"));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("forwards a scoped remove's context to the portal", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { business: { id: 1, slug: "acme" } },
    });

    await DELETE(
      request("DELETE", { context: { business: "acme", image: 5 } }),
      context("business-gallery"),
    );

    expect(callWithAuth).toHaveBeenCalledWith({
      method: "DELETE",
      path: "/uploads/business-gallery",
      body: { context: { business: "acme", image: 5 } },
    });
  });

  it("surfaces a portal error as 422", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 500,
      data: { message: "Something went wrong." },
    });

    const res = await DELETE(request("DELETE"), context("avatar"));

    expect(res.status).toBe(422);
  });
});
