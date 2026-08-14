import type { MetadataRoute } from "next";

const BASE = process.env.APP_URL ?? "https://s2br.com";

/**
 * Let crawlers index the public surfaces (home, directory, profiles, legal) but keep them out of the
 * owner portal, personal settings, and API/auth routes. Points at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/portal", "/profile", "/api", "/login", "/register"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
