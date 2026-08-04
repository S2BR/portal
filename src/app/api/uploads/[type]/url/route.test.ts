import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/uploads/avatar/url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(type: string) {
  return { params: Promise.resolve({ type }) };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/uploads/[type]/url", () => {
  it("mints a presigned upload url on success", async () => {
    const signed = {
      url: "https://s2br.s3.amazonaws.com/avatars/1/x.jpg?sig=1",
      headers: { "Content-Type": "image/jpeg" },
      key: "1/x.jpg",
    };
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: signed,
    });

    const res = await POST(
      request({ content_type: "image/jpeg" }),
      context("avatar"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(signed);
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "POST",
      path: "/uploads/avatar/url",
      body: { content_type: "image/jpeg" },
    });
  });

  it("rejects a malformed type without calling the portal", async () => {
    const res = await POST(
      request({ content_type: "image/jpeg" }),
      context("Avatar!"),
    );

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("rejects a missing content type without calling the portal", async () => {
    const res = await POST(request({}), context("avatar"));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("maps an unknown upload type to 404", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 404,
      data: { message: "Unknown upload type." },
    });

    const res = await POST(
      request({ content_type: "image/jpeg" }),
      context("banner"),
    );

    expect(res.status).toBe(404);
  });

  it("maps a rejected content type to 422", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: { message: "That file type is not allowed." },
    });

    const res = await POST(
      request({ content_type: "image/gif" }),
      context("avatar"),
    );

    expect(res.status).toBe(422);
  });
});
