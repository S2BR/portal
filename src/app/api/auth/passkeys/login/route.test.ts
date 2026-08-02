import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  setSessionCookies: vi.fn(),
}));

import { setSessionCookies } from "@/lib/auth/session";

import { POST } from "./route";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/passkeys/login", {
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

// A sign-in success body: the token pair at the top level, the user nested.
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

const validBody = {
  challenge_id: "c",
  credential: { id: "x", type: "public-key" },
};

afterEach(() => {
  fetchMock.mockReset();
  vi.clearAllMocks();
});

describe("POST /api/auth/passkeys/login", () => {
  it("stores the session and returns authenticated on a valid assertion", async () => {
    fetchMock.mockResolvedValue(portalResponse(200, signInBody));

    const res = await POST(request(validBody));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "authenticated" });
    expect(setSessionCookies).toHaveBeenCalledWith(
      expect.objectContaining({ access_token: "a", refresh_token: "r" }),
    );
  });

  it("returns invalid on a failed assertion, without a session", async () => {
    fetchMock.mockResolvedValue(portalResponse(422, { message: "nope" }));

    const res = await POST(request(validBody));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
    expect(setSessionCookies).not.toHaveBeenCalled();
  });

  it("relays rate limiting", async () => {
    fetchMock.mockResolvedValue(portalResponse(429, { message: "slow down" }));

    const res = await POST(request(validBody));

    expect(res.status).toBe(429);
    expect((await res.json()).status).toBe("rate_limited");
  });

  it("rejects a malformed body without calling the portal", async () => {
    const res = await POST(request({ challenge_id: "c" }));

    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not authenticate on a non-JSON 200 from the portal", async () => {
    fetchMock.mockResolvedValue(
      new Response("<!DOCTYPE html><html></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const res = await POST(request(validBody));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
    expect(setSessionCookies).not.toHaveBeenCalled();
  });
});
