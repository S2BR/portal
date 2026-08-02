import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { DELETE, GET } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/sessions", () => {
  it("flattens the JSON:API session collection", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        data: [
          {
            type: "sessions",
            id: "fam-1",
            attributes: {
              device_name: "Firefox on macOS",
              ip_address: "203.0.113.4",
              last_used_at: "2026-01-01T00:00:00Z",
              started_at: "2025-12-01T00:00:00Z",
              current: true,
            },
          },
        ],
      },
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect((await res.json()).sessions[0]).toMatchObject({
      id: "fam-1",
      current: true,
    });
  });

  it("returns an empty list when the api call fails", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 401,
      data: {},
    });

    const res = await GET();

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ sessions: [] });
  });
});

describe("DELETE /api/auth/sessions", () => {
  it("reports the number of revoked sessions", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { revoked: 3 },
    });

    const res = await DELETE();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", revoked: 3 });
  });
});
