import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/email/change", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/email/change", () => {
  it("advances to verification on success", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { status: "verification_required" },
    });

    const res = await POST(
      request({ email: "new@example.com", verification_token: "tok" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "verification_required",
      email: "new@example.com",
    });
  });

  it("returns invalid on a wrong password", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: { message: "The password is incorrect." },
    });

    const res = await POST(
      request({ email: "new@example.com", verification_token: "tok" }),
    );

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
  });

  it("rejects a malformed body without calling the portal", async () => {
    const res = await POST(request({ email: "not-an-email" }));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });
});
