import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({ portalFetch: vi.fn() }));

import { portalFetch } from "@/lib/api/client";

import { GET } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

it("relays a minted scoped key from the public API endpoint", async () => {
  vi.mocked(portalFetch).mockResolvedValue({
    ok: true,
    status: 200,
    data: { key: "scoped-key", host: "https://search.s2br.com", expires_at: 123 },
  });

  const res = await GET();

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({
    key: "scoped-key",
    host: "https://search.s2br.com",
    expires_at: 123,
  });
  expect(portalFetch).toHaveBeenCalledWith({
    method: "POST",
    path: "/public/search/token",
  });
});

it("503s when the mint is unavailable", async () => {
  vi.mocked(portalFetch).mockResolvedValue({ ok: false, status: 503, data: {} });

  const res = await GET();

  expect(res.status).toBe(503);
});
