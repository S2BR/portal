import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/businesses/acme/media/url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/businesses/[slug]/media/url", () => {
  it("mints a presigned upload url on success", async () => {
    const signed = {
      url: "https://s2br.s3.amazonaws.com/business/1/logo/x.png?sig=1",
      headers: { "Content-Type": "image/png" },
      key: "1/logo/x.png",
    };
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: signed,
    });

    const res = await POST(
      request({ kind: "logo", content_type: "image/png" }),
      context("acme"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(signed);
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "POST",
      path: "/businesses/acme/media/url",
      body: { kind: "logo", content_type: "image/png" },
    });
  });

  it("rejects an unknown kind without calling the portal", async () => {
    const res = await POST(
      request({ kind: "hero", content_type: "image/png" }),
      context("acme"),
    );

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("rejects a missing content type without calling the portal", async () => {
    const res = await POST(request({ kind: "logo" }), context("acme"));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("maps a not-owned business to 404", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 404,
      data: { message: "Not found." },
    });

    const res = await POST(
      request({ kind: "logo", content_type: "image/png" }),
      context("nope"),
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
      request({ kind: "logo", content_type: "image/gif" }),
      context("acme"),
    );

    expect(res.status).toBe(422);
  });
});
