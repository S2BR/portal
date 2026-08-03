import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/password/change", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const valid = {
  verification_token: "tok",
  password: "new-secret-123",
  password_confirmation: "new-secret-123",
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/password/change", () => {
  it("returns ok when the password is changed", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {},
    });

    const res = await POST(request(valid));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "POST",
      path: "/account/password/change",
      body: valid,
    });
  });

  it("surfaces a wrong current-password error", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: {
        message: "The given data was invalid.",
        errors: { current_password: ["The password is incorrect."] },
      },
    });

    const res = await POST(request(valid));
    const body = (await res.json()) as {
      status: string;
      errors?: Record<string, string[]>;
    };

    expect(res.status).toBe(422);
    expect(body.status).toBe("invalid");
    expect(body.errors?.current_password?.[0]).toContain("incorrect");
  });

  it("rejects a malformed body without calling the portal", async () => {
    const res = await POST(request({ current_password: "old" }));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });
});
