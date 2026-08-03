import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ readAccounts: vi.fn() }));

import { readAccounts } from "@/lib/auth/session";

import { GET } from "./route";

afterEach(() => vi.clearAllMocks());

describe("GET /api/auth/accounts", () => {
  it("lists the other accounts and never leaks their refresh tokens", async () => {
    vi.mocked(readAccounts).mockResolvedValue([
      { id: 2, name: "B", email: "b@x.co", refresh_token: "secret-rb" },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(body.others).toEqual([{ id: 2, name: "B", email: "b@x.co" }]);
    expect(JSON.stringify(body)).not.toContain("secret-rb");
  });

  it("returns an empty list when only one account is signed in", async () => {
    vi.mocked(readAccounts).mockResolvedValue([]);

    const res = await GET();

    expect((await res.json()).others).toEqual([]);
  });
});
