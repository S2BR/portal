import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function portalResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  fetchMock.mockReset();
});

describe("POST /api/auth/passkeys/login/options", () => {
  it("returns the request options and challenge id", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(200, {
        challenge_id: "c",
        options: { rpId: "localhost" },
      }),
    );

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.challenge_id).toBe("c");
    expect(body.options).toEqual({ rpId: "localhost" });
  });

  it("returns an error when the portal is unavailable", async () => {
    fetchMock.mockResolvedValue(portalResponse(500, { message: "down" }));

    const res = await POST();

    expect(res.status).toBe(400);
    expect((await res.json()).status).toBe("error");
  });
});
