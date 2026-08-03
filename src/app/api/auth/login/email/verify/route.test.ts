import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ setSessionCookies: vi.fn() }));

import { setSessionCookies } from "@/lib/auth/session";

import { POST } from "./route";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/login/email/verify", {
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
  user: {
    id: 1,
    name: "Ada",
    email: "a@b.co",
    timezone: null,
    two_factor_enabled: false,
    created_at: "2026-01-01T00:00:00.000000Z",
  },
};

afterEach(() => {
  fetchMock.mockReset();
  vi.clearAllMocks();
});

describe("POST /api/auth/login/email/verify", () => {
  it("signs in and stores the session on a valid code", async () => {
    fetchMock.mockResolvedValue(portalResponse(200, signInBody));

    const res = await POST(request({ email: "a@b.co", code: "123456" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "authenticated" });
    expect(setSessionCookies).toHaveBeenCalledWith(
      expect.objectContaining({ access_token: "a", refresh_token: "r" }),
    );
  });

  it("relays a 403 two_factor_required with the pending token (no session)", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(403, {
        status: "two_factor_required",
        pending_token: "pt-123",
      }),
    );

    const res = await POST(request({ email: "a@b.co", code: "123456" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "two_factor_required",
      pending_token: "pt-123",
    });
    expect(setSessionCookies).not.toHaveBeenCalled();
  });

  it("surfaces an invalid code without a session", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(422, { message: "The code is invalid or has expired." }),
    );

    const res = await POST(request({ email: "a@b.co", code: "000000" }));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
    expect(setSessionCookies).not.toHaveBeenCalled();
  });

  it("requires a code or token", async () => {
    const res = await POST(request({ email: "a@b.co" }));

    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
