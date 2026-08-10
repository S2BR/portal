import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ clearSessionCookies: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";
import { clearSessionCookies } from "@/lib/auth/session";

import { DELETE, PATCH } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/auth/account", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/account", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/auth/account", () => {
  it("applies a partial update on success", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {},
    });

    const res = await PATCH(request({ name: "Ada Lovelace" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/account",
      body: { name: "Ada Lovelace" },
    });
  });

  it("passes a null timezone through to clear the preference", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {},
    });

    await PATCH(request({ timezone: null }));

    expect(callWithAuth).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/account",
      body: { timezone: null },
    });
  });

  it("passes a date of birth through to the api", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {},
    });

    await PATCH(request({ date_of_birth: "1990-05-15" }));

    expect(callWithAuth).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/account",
      body: { date_of_birth: "1990-05-15" },
    });
  });

  it("passes a null date of birth through to clear it", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {},
    });

    await PATCH(request({ date_of_birth: null }));

    expect(callWithAuth).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/account",
      body: { date_of_birth: null },
    });
  });

  it("rejects a malformed date of birth without calling the api", async () => {
    const res = await PATCH(request({ date_of_birth: "05/15/1990" }));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("passes a gender through to the api", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {},
    });

    await PATCH(request({ gender: "non_binary" }));

    expect(callWithAuth).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/account",
      body: { gender: "non_binary" },
    });
  });

  it("passes a null gender through to clear it", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {},
    });

    await PATCH(request({ gender: null }));

    expect(callWithAuth).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/account",
      body: { gender: null },
    });
  });

  it("rejects a gender outside the allowed set without calling the api", async () => {
    const res = await PATCH(request({ gender: "martian" }));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("surfaces field errors from the api", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: {
        message: "The given data was invalid.",
        errors: { timezone: ["The timezone must be a valid zone."] },
      },
    });

    const res = await PATCH(request({ timezone: "Mars/Olympus" }));

    expect(res.status).toBe(422);
    expect((await res.json()).errors.timezone[0]).toContain("valid zone");
  });

  it("rejects an empty patch without calling the portal", async () => {
    const res = await PATCH(request({}));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/auth/account", () => {
  it("deletes the account and clears the session on success", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: {},
    });

    const res = await DELETE(deleteRequest({ verification_token: "tok" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "DELETE",
      path: "/account",
      body: { verification_token: "tok" },
    });
    expect(clearSessionCookies).toHaveBeenCalledOnce();
  });

  it("keeps the session on a wrong password", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: { message: "The password is incorrect." },
    });

    const res = await DELETE(deleteRequest({ verification_token: "bad" }));

    expect(res.status).toBe(422);
    expect((await res.json()).status).toBe("invalid");
    expect(clearSessionCookies).not.toHaveBeenCalled();
  });

  it("rejects a missing password without calling the portal", async () => {
    const res = await DELETE(deleteRequest({}));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });
});
