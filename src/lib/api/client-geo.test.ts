import { afterEach, expect, it, vi } from "vitest";

// Simulate the incoming request headers the edge (Vercel) sets. Isolated to this file so it doesn't
// change the header-less behavior the other client tests rely on.
const incoming = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => incoming.get(name.toLowerCase()) ?? null,
  })),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { portalFetch } from "./client";

afterEach(() => {
  fetchMock.mockReset();
  incoming.clear();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

it("forwards the client IP + Vercel geo as normalized X-Client-* headers", async () => {
  incoming.set("x-forwarded-for", "189.6.0.1, 10.0.0.1");
  incoming.set("x-vercel-ip-city", encodeURIComponent("São Paulo"));
  incoming.set("x-vercel-ip-country-region", "SP");
  incoming.set("x-vercel-ip-country", "BR");
  incoming.set("x-vercel-ip-timezone", "America/Sao_Paulo");
  fetchMock.mockResolvedValue(jsonResponse(200, {}));

  await portalFetch({ path: "/auth/login", method: "POST", body: {} });

  const [, init] = fetchMock.mock.calls[0]!;
  // The real client IP is the first hop of x-forwarded-for, not the BFF's.
  expect(init.headers["X-Client-Ip"]).toBe("189.6.0.1");
  expect(init.headers["X-Client-Country"]).toBe("BR");
  expect(init.headers["X-Client-Region"]).toBe("SP");
  expect(init.headers["X-Client-Timezone"]).toBe("America/Sao_Paulo");
  // Text stays percent-encoded in transit (ASCII-safe); the API URL-decodes it.
  expect(init.headers["X-Client-City"]).toBe(encodeURIComponent("São Paulo"));
});

it("omits geo headers when the edge provides none (local dev)", async () => {
  incoming.set("user-agent", "Mozilla/5.0");
  fetchMock.mockResolvedValue(jsonResponse(200, {}));

  await portalFetch({ path: "/app/config" });

  const [, init] = fetchMock.mock.calls[0]!;
  expect(init.headers["X-Client-Ip"]).toBeUndefined();
  expect(init.headers["X-Client-City"]).toBeUndefined();
  expect(init.headers["X-Client-Country"]).toBeUndefined();
});
