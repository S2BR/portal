import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { GET, POST } from "./route";

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/passkeys", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validStore = {
  name: "My key",
  password: "secret",
  challenge_id: "c",
  credential: { id: "x", type: "public-key" },
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/passkeys", () => {
  it("returns the account's passkeys", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { data: [{ id: 1, name: "Mine" }] },
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect((await res.json()).passkeys).toEqual([{ id: 1, name: "Mine" }]);
  });
});

describe("POST /api/auth/passkeys", () => {
  it("returns ok when the portal stores the passkey", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 201,
      data: {},
    });

    const res = await POST(postRequest(validStore));

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });

  it("returns invalid on a wrong password or unverifiable credential", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: { message: "The password is incorrect." },
    });

    const res = await POST(postRequest(validStore));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
  });

  it("rejects a malformed body without calling the portal", async () => {
    const res = await POST(postRequest({ name: "x" }));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });
});
