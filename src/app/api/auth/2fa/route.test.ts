import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { DELETE } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/2fa", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/auth/2fa", () => {
  it("returns ok when the portal disables 2FA", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {},
    });

    const res = await DELETE(request({ verification_token: "tok" }));

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });

  it("returns invalid on a wrong password", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: { message: "The password is incorrect." },
    });

    const res = await DELETE(request({ verification_token: "bad" }));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
  });

  it("rejects a malformed body without calling the portal", async () => {
    const res = await DELETE(request({}));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });
});
