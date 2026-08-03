import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { DELETE } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/passkeys/1", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function params(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/auth/passkeys/[id]", () => {
  it("removes a passkey with the correct password", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {},
    });

    const res = await DELETE(
      request({ verification_token: "tok" }),
      params("1"),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });

  it("passes a 404 through for an unknown or foreign passkey", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 404,
      data: { message: "not found" },
    });

    const res = await DELETE(
      request({ verification_token: "tok" }),
      params("999"),
    );

    expect(res.status).toBe(404);
  });

  it("rejects a non-numeric id without calling the portal", async () => {
    const res = await DELETE(
      request({ verification_token: "tok" }),
      params("abc"),
    );

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("rejects a missing password without calling the portal", async () => {
    const res = await DELETE(request({}), params("1"));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });
});
