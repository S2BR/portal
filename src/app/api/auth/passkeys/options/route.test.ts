import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { POST } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/passkeys/options", () => {
  it("returns the creation options and challenge id", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { challenge_id: "c", options: { challenge: "x" } },
    });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.challenge_id).toBe("c");
    expect(body.options).toEqual({ challenge: "x" });
  });

  it("returns an error when the portal rejects the request", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 400,
      data: { message: "no" },
    });

    const res = await POST();

    expect(res.status).toBe(400);
    expect((await res.json()).status).toBe("error");
  });
});
