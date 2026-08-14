import type { MetadataRoute } from "next";

import { PUBLIC_BUSINESS_PAGES_INDEXABLE } from "@/lib/seo";

const BASE = process.env.APP_URL ?? "https://s2br.com";

/**
 * Let crawlers index the public surfaces (home, legal, and — when open — the directory + profiles)
 * but keep them out of the owner portal, personal settings, and API/auth routes. While the public
 * business surfaces are closed for live testing, they're disallowed here too. Points at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/portal",
        "/profile",
        "/api",
        "/login",
        "/register",
        ...(PUBLIC_BUSINESS_PAGES_INDEXABLE ? [] : ["/businesses"]),
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
