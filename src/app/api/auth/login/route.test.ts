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

// A sign-in success body: the user as JSON:API `data`, the token pair in `meta`.
const signInBody = {
  data: {
    type: "users",
    id: "1",
    attributes: {
      name: "Ada",
      email: "a@b.co",
      timezone: null,
      two_factor_enabled: false,
      created_at: "2026-01-01T00:00:00.000000Z",
    },
  },
  meta: {
    access_token: "a",
    refresh_token: "r",
    token_type: "Bearer",
    expires_in: 900,
  },
};

afterEach(() => {
  fetchMock.mockReset();
  vi.clearAllMocks();
});

describe("POST /api/auth/login", () => {
  it("stores the session and returns authenticated on success", async () => {
    fetchMock.mockResolvedValue(portalResponse(200, signInBody));

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

  it("reports a captcha failure distinctly, not as bad credentials", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(422, {
        message: "The given data was invalid.",
        errors: { captcha_token: ["Human verification failed."] },
      }),
    );

    const res = await POST(request({ email: "a@b.co", password: "secret" }));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("captcha_failed");
  });

  it("reports a wrong second-factor code as invalid_code", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(422, {
        message: "The given data was invalid.",
        errors: { login_otp: ["The code is invalid or has expired."] },
      }),
    );

    const res = await POST(
      request({ email: "a@b.co", password: "secret", login_otp: "000000" }),
    );

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid_code");
  });

  it("rejects a malformed body without calling the portal", async () => {
    const res = await POST(request({ email: "not-an-email" }));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not authenticate on a 200 that isn't JSON (misconfigured API URL)", async () => {
    // Regression: PORTAL_API_URL pointing at the web app itself returns a 200
    // HTML page; that must never be treated as a successful login.
    fetchMock.mockResolvedValue(
      new Response("<!DOCTYPE html><html></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const res = await POST(request({ email: "a@b.co", password: "secret" }));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
    expect(setSessionCookies).not.toHaveBeenCalled();
  });

  it("forwards only non-empty fields to the portal", async () => {
    fetchMock.mockResolvedValue(portalResponse(200, signInBody));

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
