import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ readAccounts: vi.fn() }));

import { readAccounts } from "@/lib/auth/session";

import { GET } from "./route";

afterEach(() => vi.clearAllMocks());

describe("GET /api/auth/accounts", () => {
  it("lists the other accounts (with avatar) and never leaks their refresh tokens", async () => {
    vi.mocked(readAccounts).mockResolvedValue([
      {
        id: 2,
        name: "B",
        email: "b@x.co",
        refresh_token: "secret-rb",
        avatar: "https://cdn.test/2.jpg",
      },
      { id: 3, name: "C", email: "c@x.co", refresh_token: "secret-rc" },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(body.others).toEqual([
      { id: 2, name: "B", email: "b@x.co", avatar: "https://cdn.test/2.jpg" },
      // A vaulted account without an avatar surfaces as null (renders initials).
      { id: 3, name: "C", email: "c@x.co", avatar: null },
    ]);
    expect(JSON.stringify(body)).not.toContain("secret-rb");
    expect(JSON.stringify(body)).not.toContain("secret-rc");
  });

  it("returns an empty list when only one account is signed in", async () => {
    vi.mocked(readAccounts).mockResolvedValue([]);

    const res = await GET();

    expect((await res.json()).others).toEqual([]);
  });
});
