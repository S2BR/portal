import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { POST } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

function request(body: unknown): Request {
  return new Request("http://local/api/admin/search/reindex", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

it("queues a re-sync and relays 202 with the body", async () => {
  vi.mocked(callWithAuth).mockResolvedValue({
    ok: true,
    status: 202,
    data: { queued: ["products"], rebuild: false },
  });

  const res = await POST(request({ collection: "products" }));

  expect(res.status).toBe(202);
  expect(await res.json()).toEqual({ queued: ["products"], rebuild: false });
  expect(callWithAuth).toHaveBeenCalledWith({
    method: "POST",
    path: "/admin/search/reindex",
    body: { collection: "products" },
  });
});

it("surfaces a 422 validation error", async () => {
  vi.mocked(callWithAuth).mockResolvedValue({
    ok: false,
    status: 422,
    data: {},
  });

  expect((await POST(request({ collection: "nope" }))).status).toBe(422);
});

it("403s for a non-admin", async () => {
  vi.mocked(callWithAuth).mockResolvedValue({
    ok: false,
    status: 403,
    data: {},
  });

  expect((await POST(request({ collection: "all" }))).status).toBe(403);
});
