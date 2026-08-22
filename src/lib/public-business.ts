import "server-only";

import { portalFetch } from "@/lib/api/client";

import type { Amenity } from "@/app/api/amenities/route";
import type { Category } from "@/app/api/categories/route";
import type {
  BannerFocal,
  BusinessClosure,
  BusinessColors,
  BusinessContact,
  BusinessImage,
  BusinessOpeningHour,
  BusinessSocial,
  BusinessType,
} from "@/app/api/businesses/route";

/**
 * An address on a public profile — the API drops the owner-only `notes`, `is_hidden`, and resolved
 * `timezone` fields the editor sees.
 */
export interface PublicBusinessAddress {
  id: string;
  address_1: string;
  address_2: string | null;
  apartment_suite: string | null;
  city: string;
  state_province: string | null;
  postal_code: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  is_main: boolean;
}

/**
 * A published business as returned by the API's PUBLIC read (`GET /public/businesses/{slug}`). A
 * deliberately narrow shape — no owner/operator fields (is_published, is_locked, readiness, …).
 */
export interface PublicBusiness {
  id: string;
  slug: string;
  name: string;
  type: BusinessType;
  headline: string | null;
  description: string | null;
  timezone: string | null;
  logo: string | null;
  banner: string | null;
  /** Banner focal point (object-position); null = centered. */
  banner_focal: BannerFocal | null;
  colors: BusinessColors | null;
  contacts: BusinessContact[];
  socials: BusinessSocial[];
  opening_hours: BusinessOpeningHour[];
  closures: BusinessClosure[];
  addresses: PublicBusinessAddress[];
  categories: Category[];
  amenities: Amenity[];
  images: BusinessImage[];
  /** Aggregate rating from publicly-visible reviews; `rating_avg` is 0 when there are none. */
  rating_avg: number;
  rating_count: number;
  is_claimed: boolean;
  created_at: string | null;
}

/** A single public review on a business's profile. */
export interface PublicReview {
  id: string;
  rating: number;
  body: string | null;
  reviewer: { name: string | null; avatar: string | null };
  owner_reply: string | null;
  owner_replied_at: string | null;
  created_at: string | null;
}

/** How the reviews list is ordered. */
export type ReviewSort = "recent" | "oldest" | "highest" | "lowest";

/** The full-set rating summary (independent of any active filter) — powers the histogram. */
export interface ReviewSummary {
  avg: number;
  count: number;
  /** Count of reviews per star, keyed "1"–"5". */
  breakdown: Record<string, number>;
}

/** A paginated page of a business's public reviews, plus the full-set rating summary. */
export interface PublicReviewsPage {
  data: PublicReview[];
  meta: { current_page: number; last_page: number; total: number };
  rating?: ReviewSummary;
}

const EMPTY_REVIEWS: PublicReviewsPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

/**
 * Fetch a page of a business's public reviews — unauthenticated, server-side. Ordered by `sort` and
 * optionally narrowed to a single `rating`. Degrades to an empty page if the API is unreachable.
 */
export async function getPublicReviews(
  slug: string,
  page = 1,
  sort: ReviewSort = "recent",
  rating?: number,
): Promise<PublicReviewsPage> {
  const query = new URLSearchParams();
  if (page > 1) {
    query.set("page", String(page));
  }
  if (sort !== "recent") {
    query.set("sort", sort);
  }
  if (rating) {
    query.set("rating", String(rating));
  }
  const suffix = query.toString();

  const response = await portalFetch<PublicReviewsPage>({
    method: "GET",
    path: `/public/businesses/${encodeURIComponent(slug)}/reviews${suffix ? `?${suffix}` : ""}`,
  });

  return response.ok ? response.data : EMPTY_REVIEWS;
}

/**
 * Fetch a publicly-visible business by slug for its profile page — unauthenticated, server-side, so
 * it's cacheable and SEO-friendly. Returns null when the API 404s (draft, locked, or unknown — the
 * API never distinguishes them), which the page turns into `notFound()`.
 */
export async function getPublicBusiness(
  slug: string,
): Promise<PublicBusiness | null> {
  const response = await portalFetch<{ business?: PublicBusiness }>({
    method: "GET",
    path: `/public/businesses/${encodeURIComponent(slug)}`,
  });

  return response.ok ? (response.data.business ?? null) : null;
}

/** A business as a card in the directory list — the lightweight shape the list endpoint returns. */
export interface PublicBusinessCard {
  id: string;
  slug: string;
  name: string;
  type: BusinessType;
  headline: string | null;
  logo: string | null;
  banner: string | null;
  city: string | null;
  /** Main-address coordinates for the directory map; null when the business has no geocoded address. */
  latitude: number | null;
  longitude: number | null;
  categories: { slug: string; name: string }[];
  /** Aggregate rating from publicly-visible reviews; `rating_avg` is 0 when there are none. */
  rating_avg: number;
  rating_count: number;
}

/** One entry in the public business sitemap feed. */
export interface PublicBusinessSitemapEntry {
  slug: string;
  updated_at: string | null;
}

/** Fetch every publicly-visible business's slug + last-updated for `sitemap.xml`. */
export async function getPublicBusinessSitemap(): Promise<
  PublicBusinessSitemapEntry[]
> {
  const response = await portalFetch<{
    businesses?: PublicBusinessSitemapEntry[];
  }>({ method: "GET", path: "/public/businesses/sitemap" });

  return response.ok ? (response.data.businesses ?? []) : [];
}

/** A paginated page of directory results. */
export interface PublicDirectory {
  data: PublicBusinessCard[];
  meta: { current_page: number; last_page: number; total: number };
}

/** A category (with its subcategories) for the directory filter. */
export interface PublicCategory {
  id: number;
  slug: string;
  name: string;
  subcategories?: PublicCategory[];
}

const EMPTY_DIRECTORY: PublicDirectory = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

/**
 * Fetch a page of the public directory — unauthenticated, server-side. Optional free-text `q` and
 * `category` slug filters. Degrades to an empty page if the API is unreachable, so the page still
 * renders its shell.
 */
export async function getPublicDirectory(params: {
  q?: string;
  category?: string;
  page?: number;
}): Promise<PublicDirectory> {
  const query = new URLSearchParams();
  if (params.q) {
    query.set("q", params.q);
  }
  if (params.category) {
    query.set("category", params.category);
  }
  if (params.page && params.page > 1) {
    query.set("page", String(params.page));
  }
  const suffix = query.toString();

  const response = await portalFetch<PublicDirectory>({
    method: "GET",
    path: `/public/businesses${suffix ? `?${suffix}` : ""}`,
  });

  return response.ok ? response.data : EMPTY_DIRECTORY;
}

/** Fetch the category tree for the directory filter — unauthenticated, server-side. */
export async function getPublicCategories(): Promise<PublicCategory[]> {
  const response = await portalFetch<{ categories?: PublicCategory[] }>({
    method: "GET",
    path: "/public/categories",
  });

  return response.ok ? (response.data.categories ?? []) : [];
}

/** An amenity (with its children) for the directory filter labels. */
export interface PublicAmenity {
  id: number;
  slug: string;
  name: string;
  amenities?: PublicAmenity[];
}

/** Fetch the amenity tree for the directory filter labels — unauthenticated, server-side. */
export async function getPublicAmenities(): Promise<PublicAmenity[]> {
  const response = await portalFetch<{ amenities?: PublicAmenity[] }>({
    method: "GET",
    path: "/public/amenities",
  });

  return response.ok ? (response.data.amenities ?? []) : [];
}

/**
 * Flatten a category/amenity tree into a `{ slug: localized name }` map, used to label the Typesense
 * facet values — the index stores ids (a slug rename never re-indexes). Recurses through the child
 * key (`subcategories` / `amenities`).
 */
export function taxonomyLabels(
  nodes: Array<{
    id: number;
    name: string;
    subcategories?: unknown;
    amenities?: unknown;
  }>,
): Record<string, string> {
  const labels: Record<string, string> = {};
  const walk = (list: typeof nodes) => {
    for (const node of list) {
      labels[String(node.id)] = node.name;
      const children = (node.subcategories ?? node.amenities) as
        typeof nodes | undefined;
      if (Array.isArray(children)) {
        walk(children);
      }
    }
  };
  walk(nodes);
  return labels;
}

/**
 * Flatten a tree into a `{ id: { slug, name } }` map — for the directory card's category chips,
 * which resolve the indexed id to its localized name (+ slug, a stable key).
 */
export function taxonomyById(
  nodes: Array<{
    id: number;
    slug: string;
    name: string;
    subcategories?: unknown;
    amenities?: unknown;
  }>,
): Record<string, { slug: string; name: string }> {
  const map: Record<string, { slug: string; name: string }> = {};
  const walk = (list: typeof nodes) => {
    for (const node of list) {
      map[String(node.id)] = { slug: node.slug, name: node.name };
      const children = (node.subcategories ?? node.amenities) as
        typeof nodes | undefined;
      if (Array.isArray(children)) {
        walk(children);
      }
    }
  };
  walk(nodes);
  return map;
}
