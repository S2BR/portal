import type { MetadataRoute } from "next";

import { getPublicBusinessSitemap } from "@/lib/public-business";

const BASE = process.env.APP_URL ?? "https://s2br.com";

/**
 * The public sitemap: the static entry points plus every publicly-visible business profile (from the
 * API's sitemap feed), so search engines can discover and crawl the directory.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const businesses = await getPublicBusinessSitemap();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/businesses`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const profiles: MetadataRoute.Sitemap = businesses.map((business) => ({
    url: `${BASE}/businesses/${business.slug}`,
    lastModified: business.updated_at ? new Date(business.updated_at) : undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...profiles];
}
