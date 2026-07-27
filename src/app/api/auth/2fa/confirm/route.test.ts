import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/2fa/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/2fa/confirm", () => {
  it("returns recovery codes on success", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { recovery_codes: ["aaaa-1111", "bbbb-2222"] },
    });

    const res = await POST(request({ code: "123456", password: "secret" }));
    const body = (await res.json()) as { recoveryCodes: string[] };

    expect(res.status).toBe(200);
    expect(body.recoveryCodes).toEqual(["aaaa-1111", "bbbb-2222"]);
  });

  it("returns invalid on a bad code or password", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: { message: "bad" },
    });

    const res = await POST(request({ code: "000000", password: "secret" }));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
  });

  it("rejects a malformed body without calling the portal", async () => {
    const res = await POST(request({ code: "123456" }));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });
});
