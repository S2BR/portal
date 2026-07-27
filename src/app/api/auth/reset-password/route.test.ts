import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/reset-password", {
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
  email: "a@b.co",
  code: "123456",
  password: "Sup3rSecret!",
  password_confirmation: "Sup3rSecret!",
};

afterEach(() => {
  fetchMock.mockReset();
});

describe("POST /api/auth/reset-password", () => {
  it("returns ok when the portal accepts the reset", async () => {
    fetchMock.mockResolvedValue(portalResponse(200, { message: "done" }));

    const res = await POST(request(validBody));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("maps an invalid/expired code to a 422 invalid", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(422, {
        message: "The code is invalid or has expired.",
        errors: { code: ["invalid"] },
      }),
    );

    const res = await POST(request(validBody));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
  });

  it("rejects a malformed body without calling the portal", async () => {
    const res = await POST(request({ email: "a@b.co", code: "123456" }));

    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
