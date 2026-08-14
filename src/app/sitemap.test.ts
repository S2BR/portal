import { afterEach, expect, it, vi } from "vitest";

// Mutable so each test can flip the master indexing switch the sitemap reads.
const seoState = vi.hoisted(() => ({ PUBLIC_BUSINESS_PAGES_INDEXABLE: false }));

vi.mock("@/lib/public-business", () => ({
  getPublicBusinessSitemap: vi.fn(),
}));
vi.mock("@/lib/seo", () => seoState);

import { getPublicBusinessSitemap } from "@/lib/public-business";

import sitemap from "./sitemap";

afterEach(() => {
  vi.clearAllMocks();
  seoState.PUBLIC_BUSINESS_PAGES_INDEXABLE = false;
});

it("omits the business surfaces while indexing is disabled", async () => {
  const urls = (await sitemap()).map((entry) => entry.url);

  expect(urls.some((url) => url.endsWith("/businesses"))).toBe(false);
  // The API sitemap feed isn't even fetched when the surfaces are closed.
  expect(getPublicBusinessSitemap).not.toHaveBeenCalled();
  // Static entry points are still present.
  expect(urls.some((url) => url.endsWith("/"))).toBe(true);
});

it("includes the directory and every profile when indexing is enabled", async () => {
  seoState.PUBLIC_BUSINESS_PAGES_INDEXABLE = true;
  vi.mocked(getPublicBusinessSitemap).mockResolvedValue([
    { slug: "padaria-central-fjmi7z", updated_at: "2026-08-14T00:00:00Z" },
  ]);

  const urls = (await sitemap()).map((entry) => entry.url);

  expect(urls.some((url) => url.endsWith("/businesses"))).toBe(true);
  expect(
    urls.filter((url) => url.endsWith("/businesses/padaria-central-fjmi7z")),
  ).toHaveLength(1);
});
