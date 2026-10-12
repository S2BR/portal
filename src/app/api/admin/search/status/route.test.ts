import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { GET } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

it("relays the Typesense status from the admin API", async () => {
  const data = {
    healthy: true,
    configured: true,
    host: "typesense.local",
    version: "27.0",
    resources: null,
    error: null,
    collections: [],
  };
  vi.mocked(callWithAuth).mockResolvedValue({ ok: true, status: 200, data });

  const res = await GET();

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual(data);
  expect(callWithAuth).toHaveBeenCalledWith({
    method: "GET",
    path: "/admin/search/status",
  });
});

it("403s for a non-admin", async () => {
  vi.mocked(callWithAuth).mockResolvedValue({
    ok: false,
    status: 403,
    data: {},
  });

  expect((await GET()).status).toBe(403);
});

it("502s on an upstream error", async () => {
  vi.mocked(callWithAuth).mockResolvedValue({
    ok: false,
    status: 500,
    data: {},
  });

  expect((await GET()).status).toBe(502);
});
