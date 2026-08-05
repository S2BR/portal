import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { DELETE } from "./route";

const business = { id: 1, slug: "acme", name: "Acme", logo: null };

function request(): Request {
  return new Request("http://localhost/api/businesses/acme/media/logo", {
    method: "DELETE",
  });
}

function context(slug: string, kind: string) {
  return { params: Promise.resolve({ slug, kind }) };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/businesses/[slug]/media/[kind]", () => {
  it("removes the logo and returns the business", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { business },
    });

    const res = await DELETE(request(), context("acme", "logo"));

    expect(res.status).toBe(200);
    expect((await res.json()).business.logo).toBeNull();
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "DELETE",
      path: "/businesses/acme/media/logo",
    });
  });

  it("rejects a kind other than logo or banner without calling the portal", async () => {
    const res = await DELETE(request(), context("acme", "gallery"));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("maps a not-owned business to 404", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 404,
      data: { message: "Not found." },
    });

    const res = await DELETE(request(), context("nope", "banner"));

    expect(res.status).toBe(404);
  });
});
