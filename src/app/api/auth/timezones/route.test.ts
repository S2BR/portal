import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { GET } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/timezones", () => {
  it("returns the timezones", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        timezones: [
          {
            id: "America/Sao_Paulo",
            offset: "-03:00",
            label: "-03:00 · America / Sao Paulo",
          },
        ],
      },
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      timezones: [
        {
          id: "America/Sao_Paulo",
          offset: "-03:00",
          label: "-03:00 · America / Sao Paulo",
        },
      ],
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
    expect(await res.json()).toEqual({ timezones: [] });
  });
});
