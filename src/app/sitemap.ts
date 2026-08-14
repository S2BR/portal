import type { MetadataRoute } from "next";

import { getPublicBusinessSitemap } from "@/lib/public-business";
import { PUBLIC_BUSINESS_PAGES_INDEXABLE } from "@/lib/seo";

const BASE = process.env.APP_URL ?? "https://s2br.com";

/**
 * The public sitemap: the static entry points plus — when the business surfaces are open to crawlers
 * — the directory and every publicly-visible business profile (from the API's sitemap feed). While
 * those surfaces are closed for live testing, they're omitted entirely.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  if (!PUBLIC_BUSINESS_PAGES_INDEXABLE) {
    return staticPages;
  }

  const businesses = await getPublicBusinessSitemap();
  const directory: MetadataRoute.Sitemap = [
    { url: `${BASE}/businesses`, changeFrequency: "daily", priority: 0.9 },
  ];
  const profiles: MetadataRoute.Sitemap = businesses.map((business) => ({
    url: `${BASE}/businesses/${business.slug}`,
    lastModified: business.updated_at ? new Date(business.updated_at) : undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...directory, ...profiles];
}
