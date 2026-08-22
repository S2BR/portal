import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({ portalFetch: vi.fn() }));

import { portalFetch } from "@/lib/api/client";

import {
  getPublicBusiness,
  getPublicBusinessSitemap,
  getPublicDirectory,
} from "./public-business";

afterEach(() => {
  vi.clearAllMocks();
});

describe("getPublicBusiness", () => {
  it("returns the business on a 200, calling the public endpoint with no token", async () => {
    const business = {
      id: "fjmi7z",
      slug: "padaria-central-fjmi7z",
      name: "Padaria",
    };
    vi.mocked(portalFetch).mockResolvedValue({
      ok: true,
      status: 200,
      data: { business },
    });

    await expect(getPublicBusiness("padaria-central-fjmi7z")).resolves.toEqual(
      business,
    );
    expect(portalFetch).toHaveBeenCalledWith({
      method: "GET",
      path: "/public/businesses/padaria-central-fjmi7z",
    });
  });

  it("returns null when the API 404s (draft, locked, or unknown)", async () => {
    vi.mocked(portalFetch).mockResolvedValue({
      ok: false,
      status: 404,
      data: {},
    });

    await expect(getPublicBusiness("missing")).resolves.toBeNull();
  });

  it("url-encodes the slug", async () => {
    vi.mocked(portalFetch).mockResolvedValue({
      ok: true,
      status: 200,
      data: { business: undefined },
    });

    await getPublicBusiness("weird slug/../x");

    expect(portalFetch).toHaveBeenCalledWith({
      method: "GET",
      path: "/public/businesses/weird%20slug%2F..%2Fx",
    });
  });
});

describe("getPublicDirectory", () => {
  it("passes q, category, and page (>1) as query params", async () => {
    vi.mocked(portalFetch).mockResolvedValue({
      ok: true,
      status: 200,
      data: { data: [], meta: { current_page: 2, last_page: 3, total: 50 } },
    });

    await getPublicDirectory({ q: "padaria", category: "bakeries", page: 2 });

    expect(portalFetch).toHaveBeenCalledWith({
      method: "GET",
      path: "/public/businesses?q=padaria&category=bakeries&page=2",
    });
  });

  it("omits empty filters and page 1", async () => {
    vi.mocked(portalFetch).mockResolvedValue({
      ok: true,
      status: 200,
      data: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } },
    });

    await getPublicDirectory({ page: 1 });

    expect(portalFetch).toHaveBeenCalledWith({
      method: "GET",
      path: "/public/businesses",
    });
  });

  it("degrades to an empty page when the API is unreachable", async () => {
    vi.mocked(portalFetch).mockResolvedValue({
      ok: false,
      status: 502,
      data: {} as never,
    });

    await expect(getPublicDirectory({})).resolves.toEqual({
      data: [],
      meta: { current_page: 1, last_page: 1, total: 0 },
    });
  });
});

describe("getPublicBusinessSitemap", () => {
  it("returns the sitemap feed, or an empty list on failure", async () => {
    const businesses = [{ slug: "padaria-central-fjmi7z", updated_at: null }];
    vi.mocked(portalFetch).mockResolvedValue({
      ok: true,
      status: 200,
      data: { businesses },
    });
    await expect(getPublicBusinessSitemap()).resolves.toEqual(businesses);

    vi.mocked(portalFetch).mockResolvedValue({
      ok: false,
      status: 502,
      data: {},
    });
    await expect(getPublicBusinessSitemap()).resolves.toEqual([]);
  });
});
