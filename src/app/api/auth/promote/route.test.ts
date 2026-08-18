import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/accounts", () => ({
  promoteVaultedAccount: vi.fn(),
}));

import { promoteVaultedAccount } from "@/lib/auth/accounts";

import { GET } from "./route";

const user = { id: 2, name: "Grace", email: "g@x.co" };

function requestFor(next?: string) {
  const url = new URL("http://localhost/api/auth/promote");
  if (next !== undefined) {
    url.searchParams.set("next", next);
  }
  return new Request(url);
}

afterEach(() => vi.clearAllMocks());

describe("GET /api/auth/promote", () => {
  it("activates a vaulted account and bounces back to `next`", async () => {
    vi.mocked(promoteVaultedAccount).mockResolvedValue(user as never);

    const response = await GET(requestFor("/portal/admin/reports"));
    expect(new URL(response.headers.get("location") as string).pathname).toBe(
      "/portal/admin/reports",
    );
  });

  it("sends to /login when no vaulted account can be activated", async () => {
    vi.mocked(promoteVaultedAccount).mockResolvedValue(null);

    const response = await GET(requestFor("/portal"));
    const url = new URL(response.headers.get("location") as string);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe("/portal");
  });

  it("rejects an off-site `next` (no open redirect)", async () => {
    vi.mocked(promoteVaultedAccount).mockResolvedValue(user as never);

    const response = await GET(requestFor("//evil.example.com"));
    expect(new URL(response.headers.get("location") as string).pathname).toBe(
      "/portal",
    );
  });
});
