import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/public-business", () => ({
  getPublicBusinessSitemap: vi.fn(),
}));

import { getPublicBusinessSitemap } from "@/lib/public-business";

import sitemap from "./sitemap";

afterEach(() => {
  vi.clearAllMocks();
});

it("includes the static pages and every business profile", async () => {
  vi.mocked(getPublicBusinessSitemap).mockResolvedValue([
    { slug: "padaria-central-fjmi7z", updated_at: "2026-08-14T00:00:00Z" },
  ]);

  const entries = await sitemap();
  const urls = entries.map((entry) => entry.url);

  // A representative static page and the business profile, as absolute URLs.
  expect(urls.some((url) => url.endsWith("/businesses"))).toBe(true);
  expect(
    urls.filter((url) => url.endsWith("/businesses/padaria-central-fjmi7z")),
  ).toHaveLength(1);
});
