import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { PATCH } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/account", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/auth/account", () => {
  it("applies a partial update on success", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {},
    });

    const res = await PATCH(request({ name: "Ada Lovelace" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/account",
      body: { name: "Ada Lovelace" },
    });
  });

  it("passes a null timezone through to clear the preference", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {},
    });

    await PATCH(request({ timezone: null }));

    expect(callWithAuth).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/account",
      body: { timezone: null },
    });
  });

  it("surfaces field errors from the api", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: {
        message: "The given data was invalid.",
        errors: { timezone: ["The timezone must be a valid zone."] },
      },
    });

    const res = await PATCH(request({ timezone: "Mars/Olympus" }));

    expect(res.status).toBe(422);
    expect((await res.json()).errors.timezone[0]).toContain("valid zone");
  });

  it("rejects an empty patch without calling the portal", async () => {
    const res = await PATCH(request({}));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });
});
