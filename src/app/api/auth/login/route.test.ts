import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  setSessionCookies: vi.fn(),
}));

import { setSessionCookies } from "@/lib/auth/session";

import { POST } from "./route";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/login", {
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

const tokenPair = {
  access_token: "a",
  refresh_token: "r",
  token_type: "Bearer",
  expires_in: 900,
  user: { id: 1 },
};

afterEach(() => {
  fetchMock.mockReset();
  vi.clearAllMocks();
});

describe("POST /api/auth/login", () => {
  it("stores the session and returns authenticated on success", async () => {
    fetchMock.mockResolvedValue(portalResponse(200, tokenPair));

    const res = await POST(request({ email: "a@b.co", password: "secret" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "authenticated" });
    expect(setSessionCookies).toHaveBeenCalledWith(
      expect.objectContaining({ access_token: "a", refresh_token: "r" }),
    );
  });

  it("relays a 403 login_otp_required as a next step (no session set)", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(403, { status: "login_otp_required", message: "otp" }),
    );

    const res = await POST(request({ email: "a@b.co", password: "secret" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "login_otp_required",
      email: "a@b.co",
    });
    expect(setSessionCookies).not.toHaveBeenCalled();
  });

  it("maps a 422 to a generic invalid with field errors", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(422, { message: "bad", errors: { email: ["nope"] } }),
    );

    const res = await POST(request({ email: "a@b.co", password: "secret" }));
    const body = (await res.json()) as {
      status: string;
      errors?: Record<string, string[]>;
    };

    expect(res.status).toBe(422);
    expect(body.status).toBe("invalid");
    expect(body.errors?.email?.[0]).toBe("nope");
  });

  it("rejects a malformed body without calling the portal", async () => {
    const res = await POST(request({ email: "not-an-email" }));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards only non-empty fields to the portal", async () => {
    fetchMock.mockResolvedValue(portalResponse(200, tokenPair));

    await POST(
      request({
        email: "a@b.co",
        password: "secret",
        login_otp: "",
        two_factor_code: "123456",
      }),
    );

    const init = fetchMock.mock.calls[0]![1];
    expect(JSON.parse(init.body)).toEqual({
      email: "a@b.co",
      password: "secret",
      two_factor_code: "123456",
    });
  });
});
