import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function request(context?: string): Request {
  const url =
    context === undefined
      ? "http://localhost/api/auth/captcha"
      : `http://localhost/api/auth/captcha?context=${context}`;
  return new Request(url);
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

describe("GET /api/auth/captcha", () => {
  it("relays the portal challenge for a valid context", async () => {
    fetchMock.mockResolvedValue(
      portalResponse(200, {
        required: true,
        challenge_id: "abc",
        driver: "turnstile",
        site_key: "sk",
      }),
    );

    const res = await GET(request("login"));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      required: true,
      challenge_id: "abc",
      driver: "turnstile",
    });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://portal.s2br.com/api/v1/auth/captcha?context=login",
    );
  });

  it("reports not required for an unknown context without calling the portal", async () => {
    const res = await GET(request("bogus"));

    expect(await res.json()).toEqual({ required: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to not required when the portal endpoint is unavailable", async () => {
    fetchMock.mockResolvedValue(portalResponse(404, {}));

    const res = await GET(request("register"));

    expect(await res.json()).toEqual({ required: false });
  });

  it("falls back to not required when the portal call throws", async () => {
    fetchMock.mockRejectedValue(new Error("network"));

    const res = await GET(request("login"));

    expect(await res.json()).toEqual({ required: false });
  });
});
