import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/email/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/email/verify", () => {
  it("returns ok when the code is accepted", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {},
    });

    const res = await POST(request({ code: "123456" }));

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });

  it("returns invalid on a bad code", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: { message: "invalid" },
    });

    const res = await POST(request({ code: "000000" }));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
  });

  it("rejects a malformed body without calling the portal", async () => {
    const res = await POST(request({}));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });
});
