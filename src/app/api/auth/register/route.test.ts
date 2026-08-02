import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/register", {
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

const validBody = {
  name: "Ada",
  email: "a@b.co",
  password: "Sup3rSecret!",
  password_confirmation: "Sup3rSecret!",
  accept_terms: true,
};

afterEach(() => {
  fetchMock.mockReset();
});

describe("POST /api/auth/register", () => {
  it("relays verification_required on a 201", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(201, { status: "verification_required", email: "a@b.co" }),
    );

    const res = await POST(request(validBody));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "verification_required",
      email: "a@b.co",
    });
  });

  it("maps a 422 to invalid with field errors", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(422, { message: "bad", errors: { password: ["weak"] } }),
    );

    const res = await POST(request(validBody));
    const body = (await res.json()) as {
      status: string;
      errors?: Record<string, string[]>;
    };

    expect(res.status).toBe(422);
    expect(body.status).toBe("invalid");
    expect(body.errors?.password?.[0]).toBe("weak");
  });

  it("surfaces a diagnostic (not a blank message) when the API returns non-JSON", async () => {
    // e.g. an HTML 500 page, or a mispointed PORTAL_API_URL — the failure must
    // not be masked as a message-less generic error.
    fetchMock.mockResolvedValue(
      new Response("<!DOCTYPE html><html>Bad Gateway</html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      }),
    );

    const res = await POST(request(validBody));
    const body = (await res.json()) as { status: string; message?: string };

    expect(res.status).toBe(422);
    expect(body.status).toBe("invalid");
    expect(body.message).toContain("502");
  });

  it("reports a captcha failure distinctly", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(422, {
        message: "The given data was invalid.",
        errors: { captcha_token: ["Human verification failed."] },
      }),
    );

    const res = await POST(request(validBody));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("captcha_failed");
  });

  it("rejects registration when the terms are not accepted (API requires it)", async () => {
    const res = await POST(request({ ...validBody, accept_terms: false }));

    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed body without calling the portal", async () => {
    const res = await POST(request({ email: "a@b.co" }));

    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
