import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { POST } from "./route";

const business = {
  id: 1,
  slug: "acme",
  name: "Acme",
  logo: "https://cdn.test/1/logo/x.png",
};

function request(body?: unknown): Request {
  return new Request("http://localhost/api/businesses/acme/media", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function context(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/businesses/[slug]/media (attach)", () => {
  it("confirms an uploaded object and returns the business", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { business },
    });

    const res = await POST(
      request({ kind: "logo", key: "1/logo/x.png" }),
      context("acme"),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).business.slug).toBe("acme");
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "POST",
      path: "/businesses/acme/media",
      body: { kind: "logo", key: "1/logo/x.png" },
    });
  });

  it("rejects an unknown kind without calling the portal", async () => {
    const res = await POST(
      request({ kind: "hero", key: "1/logo/x.png" }),
      context("acme"),
    );

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("rejects a missing key without calling the portal", async () => {
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
      request({ kind: "gallery", key: "1/gallery/x.png" }),
      context("nope"),
    );

    expect(res.status).toBe(404);
  });

  it("maps a rejected object to 422", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: { message: "That upload could not be accepted." },
    });

    const res = await POST(
      request({ kind: "gallery", key: "9/gallery/other.png" }),
      context("acme"),
    );

    expect(res.status).toBe(422);
  });
});
