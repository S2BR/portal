import "server-only";

import { cache } from "react";

import { portalFetch } from "@/lib/api/client";

import type { AdsPage, MarketplaceAd } from "@/lib/marketplace/types";

const EMPTY_PAGE: AdsPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

/**
 * Fetch a page of the public marketplace directory — unauthenticated, server-side, with an optional
 * free-text `q`. Degrades to an empty page if the API is unreachable so the page still renders its shell.
 */
export async function getPublicAds(params: {
  q?: string;
  page?: number;
}): Promise<AdsPage> {
  const query = new URLSearchParams();
  if (params.q) {
    query.set("q", params.q);
  }
  if (params.page && params.page > 1) {
    query.set("page", String(params.page));
  }
  const suffix = query.toString();

  const response = await portalFetch<AdsPage>({
    method: "GET",
    path: `/marketplace/ads${suffix ? `?${suffix}` : ""}`,
  });

  return response.ok ? response.data : EMPTY_PAGE;
}

/**
 * Fetch a single publicly-listed ad by slug for its detail page — unauthenticated, server-side, so it's
 * cacheable and SEO-friendly. Returns null when the API 404s (sold, expired, or unknown).
 */
export async function getPublicAd(slug: string): Promise<MarketplaceAd | null> {
  const response = await portalFetch<{ data?: MarketplaceAd }>({
    method: "GET",
    path: `/marketplace/ads/${encodeURIComponent(slug)}`,
  });

  return response.ok ? (response.data.data ?? null) : null;
}

/** Per-request-memoized `getPublicAd` — shared by the ad page + its `generateMetadata`. */
export const getCachedPublicAd = cache(getPublicAd);
