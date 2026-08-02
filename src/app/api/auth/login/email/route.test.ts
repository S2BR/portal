import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/login/email", {
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
});

describe("POST /api/auth/login/email", () => {
  it("advances to the code step (enumeration-safe) on success", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(200, { message: "sent", retry_after: 60 }),
    );

    const res = await POST(request({ email: "a@b.co" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "code_sent",
      email: "a@b.co",
      retry_after: 60,
    });
  });

  it("relays rate limiting", async () => {
    fetchMock.mockResolvedValue(portalResponse(429, { message: "slow down" }));

    const res = await POST(request({ email: "a@b.co" }));

    expect(res.status).toBe(429);
    expect((await res.json()).status).toBe("rate_limited");
  });

  it("rejects a malformed body without calling the API", async () => {
    const res = await POST(request({ email: "nope" }));

    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
