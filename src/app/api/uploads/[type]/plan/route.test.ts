import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { POST } from "./route";

function request(body?: unknown): Request {
  return new Request("http://localhost/api/uploads/avatar/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function context(type: string) {
  return { params: Promise.resolve({ type }) };
}

const postPlan = {
  mode: "post",
  upload: "abc123",
  key: "tmp/x.jpg",
  url: "https://s2br.s3.amazonaws.com",
  fields: { key: "avatars/tmp/x.jpg", Policy: "p", "X-Amz-Signature": "s" },
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/uploads/[type]/plan", () => {
  it("mints a plan and returns it", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: postPlan,
    });

    const res = await POST(
      request({ content_type: "image/jpeg", size: 1024 }),
      context("avatar"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(postPlan);
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "POST",
      path: "/uploads/avatar/plan",
      body: { content_type: "image/jpeg", size: 1024 },
    });
  });

  it("forwards a scoped plan's context to the portal", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: postPlan,
    });

    await POST(
      request({
        content_type: "image/png",
        size: 2048,
        context: { business: "acme" },
      }),
      context("business-logo"),
    );

    expect(callWithAuth).toHaveBeenCalledWith({
      method: "POST",
      path: "/uploads/business-logo/plan",
      body: {
        content_type: "image/png",
        size: 2048,
        context: { business: "acme" },
      },
    });
  });

  it("rejects a malformed type without calling the portal", async () => {
    const res = await POST(
      request({ content_type: "image/jpeg", size: 1024 }),
      context("Avatar!"),
    );

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("rejects a missing size without calling the portal", async () => {
    const res = await POST(
      request({ content_type: "image/jpeg" }),
      context("avatar"),
    );

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
      request({ content_type: "image/jpeg", size: 1024 }),
      context("banner"),
    );

    expect(res.status).toBe(404);
  });

  it("maps a rejected plan (oversize / wrong mime) to 422", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: { message: "That file is too large." },
    });

    const res = await POST(
      request({ content_type: "image/jpeg", size: 99999999 }),
      context("avatar"),
    );

    expect(res.status).toBe(422);
  });
});
