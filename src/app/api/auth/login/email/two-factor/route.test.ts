import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ setSessionCookies: vi.fn() }));

import { setSessionCookies } from "@/lib/auth/session";

import { POST } from "./route";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/login/email/two-factor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function portalResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const signInBody = {
  access_token: "a",
  refresh_token: "r",
  token_type: "Bearer",
  expires_in: 900,
  user: { id: 1 },
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/login/email/two-factor", () => {
  it("stores the session on success", async () => {
    fetchMock.mockResolvedValue(portalResponse(200, signInBody));

    const res = await POST(
      request({ pending_token: "pt-123", two_factor_code: "123456" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "authenticated" });
    expect(setSessionCookies).toHaveBeenCalledOnce();
  });

  it("surfaces a bad 2FA code without a session", async () => {
    fetchMock.mockResolvedValue(portalResponse(422, { message: "bad code" }));

    const res = await POST(
      request({ pending_token: "pt-123", two_factor_code: "000000" }),
    );

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
    expect(setSessionCookies).not.toHaveBeenCalled();
  });

  it("rejects a malformed body without calling the portal", async () => {
    const res = await POST(request({ pending_token: "pt-123" }));

    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
