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
  /**
   * Absolute UTC 15-minute "open" epoch slots over a rolling window — drives the live open/closed
   * status badge (see `computeOpenState`). Empty when the business has no usable hours.
   */
  open_slots: number[];
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

/** A business's public display section — a localized name, in order. */
export interface PublicSection {
  id: string;
  name: string;
  order: number;
}

/** One product in a business's PUBLIC catalog (a sighting), for the profile / catalog page. */
export interface PublicCatalogItem {
  id: string;
  price: number | null;
  currency: string | null;
  location_label: string | null;
  /** The business's own photo if it uploaded one, else the catalog product's admin cover. */
  cover_image: string | null;
  /** Whether the owner highlighted this product (shown on the profile). */
  is_featured: boolean;
  /** The sections this product is in (their ids). */
  section_ids: string[];
  variant: {
    id: string;
    label: string | null;
    size: string | null;
    unit: string | null;
    barcode: string | null;
    product: {
      id: string;
      slug: string;
      name: string;
      brand: string | null;
      is_homemade: boolean;
    } | null;
  } | null;
}

/** A business's public catalog — its available products plus its display sections. */
export interface PublicCatalog {
  products: PublicCatalogItem[];
  sections: PublicSection[];
}

const EMPTY_CATALOG: PublicCatalog = { products: [], sections: [] };

/**
 * Fetch a business's public catalog (its available products + sections) — unauthenticated,
 * server-side. `featured` narrows to the highlighted products (for the profile). Degrades to an empty
 * catalog if the API is unreachable, so the page still renders.
 */
export async function getPublicBusinessProducts(
  slug: string,
  options: { featured?: boolean } = {},
): Promise<PublicCatalog> {
  const suffix = options.featured ? "?featured=1" : "";
  const response = await portalFetch<{
    products?: PublicCatalogItem[];
    sections?: PublicSection[];
  }>({
    method: "GET",
    path: `/public/businesses/${encodeURIComponent(slug)}/products${suffix}`,
  });

  return response.ok
    ? {
        products: response.data.products ?? [],
        sections: response.data.sections ?? [],
      }
    : EMPTY_CATALOG;
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
  /** Absolute UTC 15-minute "open" epoch slots — powers the "Closes at" hint under the open-now filter. */
  open_slots: number[];
  /** The business's IANA zone, so the "Closes at" time renders in local time; null when unknown. */
  timezone: string | null;
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
