import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  readAccounts: vi.fn(),
  writeAccounts: vi.fn(),
}));
vi.mock("@/lib/auth/accounts", () => ({
  activateRefreshToken: vi.fn(),
  captureActiveAccount: vi.fn(),
}));

import {
  activateRefreshToken,
  captureActiveAccount,
} from "@/lib/auth/accounts";
import { readAccounts, writeAccounts } from "@/lib/auth/session";

import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/accounts/switch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const A = { id: 1, name: "A", email: "a@x.co", refresh_token: "ra" };
const B = { id: 2, name: "B", email: "b@x.co", refresh_token: "rb" };

afterEach(() => vi.clearAllMocks());

describe("POST /api/auth/accounts/switch", () => {
  it("promotes the target and vaults the previously active account", async () => {
    vi.mocked(readAccounts).mockResolvedValue([B]);
    vi.mocked(captureActiveAccount).mockResolvedValue(A);
    vi.mocked(activateRefreshToken).mockResolvedValue(true);

    const res = await POST(request({ id: 2 }));

    expect(res.status).toBe(200);
    expect(activateRefreshToken).toHaveBeenCalledWith("rb");
    // Vault ends as [A]: target B removed, the previous active A pushed in.
    expect(writeAccounts).toHaveBeenCalledWith([A]);
  });

  it("404s for an account not in the vault", async () => {
    vi.mocked(readAccounts).mockResolvedValue([B]);

    const res = await POST(request({ id: 99 }));

    expect(res.status).toBe(404);
    expect(activateRefreshToken).not.toHaveBeenCalled();
  });

  it("drops a target whose session has expired (422)", async () => {
    vi.mocked(readAccounts).mockResolvedValue([B]);
    vi.mocked(captureActiveAccount).mockResolvedValue(A);
    vi.mocked(activateRefreshToken).mockResolvedValue(false);

    const res = await POST(request({ id: 2 }));

    expect(res.status).toBe(422);
    expect(writeAccounts).toHaveBeenCalledWith([]); // B removed, nothing promoted
  });

  it("422s on a malformed body without touching the session", async () => {
    const res = await POST(request({}));

    expect(res.status).toBe(422);
    expect(readAccounts).not.toHaveBeenCalled();
  });
});
