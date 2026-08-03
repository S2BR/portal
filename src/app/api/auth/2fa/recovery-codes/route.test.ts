import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/2fa/recovery-codes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/2fa/recovery-codes", () => {
  it("returns the fresh recovery codes on success", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { recovery_codes: ["aaaa-bbbb", "cccc-dddd"] },
    });

    const res = await POST(request({ verification_token: "tok" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "ok",
      recoveryCodes: ["aaaa-bbbb", "cccc-dddd"],
    });
  });

  it("maps a 409 to two_factor_not_enabled", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 409,
      data: { status: "two_factor_not_enabled" },
    });

    const res = await POST(request({ verification_token: "tok" }));

    expect(res.status).toBe(409);
    expect((await res.json()).status).toBe("two_factor_not_enabled");
  });

  it("rejects a wrong password", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: { message: "The password is incorrect." },
    });

    const res = await POST(request({ verification_token: "bad" }));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
  });

  it("rejects a malformed body without calling the API", async () => {
    const res = await POST(request({}));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });
});
