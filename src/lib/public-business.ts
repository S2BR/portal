import "server-only";

import { portalFetch } from "@/lib/api/client";

import type { Amenity } from "@/app/api/amenities/route";
import type { Category } from "@/app/api/categories/route";
import type {
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
  colors: BusinessColors | null;
  contacts: BusinessContact[];
  socials: BusinessSocial[];
  opening_hours: BusinessOpeningHour[];
  closures: BusinessClosure[];
  addresses: PublicBusinessAddress[];
  categories: Category[];
  amenities: Amenity[];
  images: BusinessImage[];
  is_claimed: boolean;
  created_at: string | null;
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
