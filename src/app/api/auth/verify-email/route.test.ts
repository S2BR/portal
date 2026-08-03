import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/accounts", () => ({ establishSession: vi.fn() }));

import { establishSession } from "@/lib/auth/accounts";

import { POST } from "./route";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/verify-email", {
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

afterEach(() => {
  fetchMock.mockReset();
  vi.clearAllMocks();
});

describe("POST /api/auth/verify-email", () => {
  it("sets the session and returns authenticated on success", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(200, {
        access_token: "a",
        refresh_token: "r",
        token_type: "Bearer",
        expires_in: 900,
        user: { id: 1 },
      }),
    );

    const res = await POST(request({ email: "a@b.co", code: "123456" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "authenticated" });
    expect(establishSession).toHaveBeenCalledTimes(1);
  });

  it("returns invalid on a bad code without setting a session", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(422, {
        message: "The code is invalid or has expired.",
        errors: { code: ["invalid"] },
      }),
    );

    const res = await POST(request({ email: "a@b.co", code: "000000" }));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
    expect(establishSession).not.toHaveBeenCalled();
  });
});
