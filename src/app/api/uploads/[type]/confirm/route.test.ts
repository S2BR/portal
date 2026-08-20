import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { POST } from "./route";

function request(body?: unknown): Request {
  return new Request("http://localhost/api/uploads/avatar/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function context(type: string) {
  return { params: Promise.resolve({ type }) };
}

const user = { id: 1, name: "Ada", avatar: "https://cdn.test/1/x.jpg" };

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/uploads/[type]/confirm", () => {
  it("confirms a POST upload by id and returns the payload", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { user },
    });

    const res = await POST(request({ upload: "abc123" }), context("avatar"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user });
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "POST",
      path: "/uploads/avatar/confirm",
      body: { upload: "abc123" },
    });
  });

  it("forwards multipart parts + a scoped context to the portal", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { business: { id: 1, slug: "acme" } },
    });

    await POST(
      request({
        upload: "xyz",
        parts: [{ number: 1, etag: "e1" }],
        context: { business: "acme" },
      }),
      context("business-logo"),
    );

    expect(callWithAuth).toHaveBeenCalledWith({
      method: "POST",
      path: "/uploads/business-logo/confirm",
      body: {
        upload: "xyz",
        parts: [{ number: 1, etag: "e1" }],
        context: { business: "acme" },
      },
    });
  });

  it("rejects a malformed type without calling the portal", async () => {
    const res = await POST(request({ upload: "abc" }), context("Avatar!"));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("rejects a missing upload id without calling the portal", async () => {
    const res = await POST(request({}), context("avatar"));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("maps an unknown upload id to 404", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 404,
      data: { message: "Not found." },
    });

    const res = await POST(request({ upload: "ghost" }), context("avatar"));

    expect(res.status).toBe(404);
  });
});
