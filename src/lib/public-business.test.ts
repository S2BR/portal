import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({ portalFetch: vi.fn() }));

import { portalFetch } from "@/lib/api/client";

import { getPublicBusiness } from "./public-business";

afterEach(() => {
  vi.clearAllMocks();
});

describe("getPublicBusiness", () => {
  it("returns the business on a 200, calling the public endpoint with no token", async () => {
    const business = { id: "fjmi7z", slug: "padaria-central-fjmi7z", name: "Padaria" };
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
