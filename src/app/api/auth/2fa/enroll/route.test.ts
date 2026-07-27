import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { POST } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/2fa/enroll", () => {
  it("returns the secret and otpauth url", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { secret: "SECRET", otpauth_url: "otpauth://totp/x" },
    });

    const res = await POST();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      secret: "SECRET",
      otpauthUrl: "otpauth://totp/x",
    });
  });

  it("propagates a 409 when 2FA is already enabled", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 409,
      data: { message: "already" },
    });

    const res = await POST();

    expect(res.status).toBe(409);
  });
});
