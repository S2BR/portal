import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { DELETE } from "./route";

const business = { id: 1, slug: "acme", name: "Acme", images: [] };

function request(): Request {
  return new Request("http://localhost/api/businesses/acme/gallery/5", {
    method: "DELETE",
  });
}

function context(slug: string, image: string) {
  return { params: Promise.resolve({ slug, image }) };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/businesses/[slug]/gallery/[image]", () => {
  it("removes a gallery image and returns the business", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { business },
    });

    const res = await DELETE(request(), context("acme", "5"));

    expect(res.status).toBe(200);
    expect((await res.json()).business.images).toEqual([]);
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "DELETE",
      path: "/businesses/acme/gallery/5",
    });
  });

  it("rejects a non-numeric image id without calling the portal", async () => {
    const res = await DELETE(request(), context("acme", "abc"));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("maps a not-owned business to 404", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 404,
      data: { message: "Not found." },
    });

    const res = await DELETE(request(), context("nope", "5"));

    expect(res.status).toBe(404);
  });
});
