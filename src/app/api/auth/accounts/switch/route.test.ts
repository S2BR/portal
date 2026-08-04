import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getRefreshToken: vi.fn(),
  readAccounts: vi.fn(),
  writeAccounts: vi.fn(),
}));
vi.mock("@/lib/auth/accounts", () => ({ activateRefreshToken: vi.fn() }));

import { activateRefreshToken } from "@/lib/auth/accounts";
import {
  getRefreshToken,
  readAccounts,
  writeAccounts,
} from "@/lib/auth/session";

import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/accounts/switch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const A = { id: 1, name: "A", email: "a@x.co" };
const B = { id: 2, name: "B", email: "b@x.co", refresh_token: "rb" };

afterEach(() => vi.clearAllMocks());

describe("POST /api/auth/accounts/switch", () => {
  it("promotes the target and vaults the current account without an API call", async () => {
    vi.mocked(readAccounts).mockResolvedValue([B]);
    vi.mocked(getRefreshToken).mockResolvedValue("ra"); // current session's token, from the cookie
    vi.mocked(activateRefreshToken).mockResolvedValue(true);

    const res = await POST(request({ id: 2, current: A }));

    expect(res.status).toBe(200);
    expect(activateRefreshToken).toHaveBeenCalledWith("rb");
    // Vault ends as [A]: target B removed, current A vaulted with its cookie token.
    expect(writeAccounts).toHaveBeenCalledWith([{ ...A, refresh_token: "ra" }]);
  });

  it("404s for an account not in the vault", async () => {
    vi.mocked(readAccounts).mockResolvedValue([B]);

    const res = await POST(request({ id: 99, current: A }));

    expect(res.status).toBe(404);
    expect(activateRefreshToken).not.toHaveBeenCalled();
  });

  it("drops a target whose session expired (422) and leaves the current session untouched", async () => {
    vi.mocked(readAccounts).mockResolvedValue([B]);
    vi.mocked(getRefreshToken).mockResolvedValue("ra");
    vi.mocked(activateRefreshToken).mockResolvedValue(false);

    const res = await POST(request({ id: 2, current: A }));

    expect(res.status).toBe(422);
    expect(writeAccounts).toHaveBeenCalledWith([]); // B removed, nothing promoted
  });

  it("422s on a malformed body without touching the session", async () => {
    const res = await POST(request({}));

    expect(res.status).toBe(422);
    expect(readAccounts).not.toHaveBeenCalled();
  });
});
