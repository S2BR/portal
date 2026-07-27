import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  fetchMock.mockReset();
});

describe("POST /api/auth/forgot-password", () => {
  it("always returns ok and relays the cooldown (enumeration-safe)", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "sent", retry_after: 60 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const res = await POST(request({ email: "a@b.co" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", retryAfter: 60 });
  });

  it("rejects a malformed body without calling the portal", async () => {
    const res = await POST(request({ email: "nope" }));

    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
