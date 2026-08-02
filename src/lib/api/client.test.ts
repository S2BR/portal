import { afterEach, describe, expect, it, vi } from "vitest";

import { portalErrorMessage, portalFetch } from "./client";
import type { ApiError } from "./types";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("portalFetch", () => {
  it("issues a GET with JSON Accept and no body", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    const res = await portalFetch<{ ok: boolean }>({ path: "/app/config" });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://portal.s2br.com/api/v1/app/config");
    expect(init.method).toBe("GET");
    expect(init.headers.Accept).toBe("application/json");
    expect(init.body).toBeUndefined();
    expect(init.cache).toBe("no-store");
  });

  it("issues a POST with a JSON body and bearer token", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await portalFetch({
      method: "POST",
      path: "/auth/login",
      body: { email: "a@b.co" },
      token: "tok",
    });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({ email: "a@b.co" });
  });

  it("forwards the locale as Accept-Language", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await portalFetch({ path: "/x", locale: "fr_CA" });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers["Accept-Language"]).toBe("fr_CA");
  });

  it("returns ok=false and the parsed error envelope on 422", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, { message: "bad", errors: { email: ["taken"] } }),
    );

    const res = await portalFetch<ApiError>({
      method: "POST",
      path: "/auth/register",
      body: {},
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(422);
    expect(res.data.errors?.email?.[0]).toBe("taken");
  });

  it("tolerates a non-JSON response body", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));

    const res = await portalFetch({ path: "/x" });

    expect(res.status).toBe(500);
    expect(res.data).toEqual({});
    expect(res.nonJson).toBe("boom");
  });

  it("fails closed on a 2xx whose body isn't JSON (misrouted HTML page)", async () => {
    fetchMock.mockResolvedValue(
      new Response("<!DOCTYPE html><html></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const res = await portalFetch({ method: "POST", path: "/auth/login" });

    // A 200 that isn't JSON must never read as a successful API call.
    expect(res.ok).toBe(false);
    expect(res.data).toEqual({});
    expect(res.nonJson).toContain("<!DOCTYPE html>");
  });

  it("treats an empty 2xx body as an ok, empty result", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 200 }));

    const res = await portalFetch({ path: "/x" });

    expect(res.ok).toBe(true);
    expect(res.data).toEqual({});
  });
});

describe("portalErrorMessage", () => {
  it("prefers the API's own message when present", () => {
    const message = portalErrorMessage({
      ok: false,
      status: 422,
      data: { message: "The email has already been taken." },
    });

    expect(message).toBe("The email has already been taken.");
  });

  it("names a non-JSON body with its status", () => {
    const message = portalErrorMessage({
      ok: false,
      status: 502,
      data: {},
      nonJson: "<!DOCTYPE html>",
    });

    expect(message).toContain("non-JSON");
    expect(message).toContain("502");
  });

  it("names the status when the API sent no message", () => {
    const message = portalErrorMessage({ ok: false, status: 500, data: {} });

    expect(message).toContain("500");
  });
});
