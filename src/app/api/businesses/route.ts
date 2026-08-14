import { NextResponse } from "next/server";
import { z } from "zod";

import type { Amenity } from "@/app/api/amenities/route";
import type { Category } from "@/app/api/categories/route";
import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

export type BusinessType = "company" | "self_employed";
export type BusinessContactType = "website" | "phone" | "email";
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export type BusinessSocialNetwork =
  | "instagram"
  | "facebook"
  | "x"
  | "linkedin"
  | "youtube"
  | "tiktok"
  | "pinterest"
  | "snapchat"
  | "reddit"
  | "tumblr"
  | "vimeo"
  | "whatsapp"
  | "telegram"
  | "discord"
  | "github"
  | "stackoverflow"
  | "medium"
  | "slack"
  | "wechat";

export interface BusinessContact {
  /** Stable public code; round-tripped on save to update this row in place. */
  id: string;
  type: BusinessContactType;
  value: string;
  name: string | null;
  /** Open-ended bag; for phones it holds `country` (ISO 3166-1 alpha-2) for view-time formatting. */
  meta: ({ country?: string } & Record<string, unknown>) | null;
}

export interface BusinessSocial {
  id: string;
  platform: BusinessSocialNetwork;
  handle: string;
}

export interface BusinessOpeningHour {
  day_of_week: DayOfWeek;
  open_time: string | null;
  close_time: string | null;
  closed_all_day: boolean;
}

/** A closed date — a single day (start == end) or an inclusive range; `is_recurring` repeats it every
 *  year (matched by month + day). Dates are `YYYY-MM-DD`. */
export interface BusinessClosure {
  id: string;
  name: string | null;
  start_date: string;
  end_date: string;
  is_recurring: boolean;
  /** Open/close ranges on the date(s); empty ⇒ closed all day. */
  hours: { open: string; close: string }[];
}

export interface BusinessAddress {
  /** Stable public code (never the raw integer); round-tripped on save. */
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
  // IANA zone resolved from the coordinates; null when it has none or Google couldn't resolve it.
  timezone: string | null;
  notes: string | null;
  is_main: boolean;
  is_hidden: boolean;
}

export interface BusinessColors {
  primary: string | null;
}

export interface BusinessImage {
  id: string;
  url: string;
}

/**
 * A business as returned by the API's flat `{business}` / `{businesses}` envelopes. The child
 * collections and address are present on single-business responses and omitted from the list.
 */
export interface Business {
  /** The opaque public code (stable across renames); `slug` is the canonical `name-slug-<code>`. */
  id: string;
  slug: string;
  name: string;
  type: BusinessType;
  headline: string | null;
  description: string | null;
  // IANA zone governing all of the business's hours; defaults from the main address.
  timezone: string | null;
  colors: BusinessColors | null;
  category_suggestion: string | null;
  // Presigned GET urls (short-lived) for the single logo + banner; null when unset. Always
  // present since they're columns.
  logo: string | null;
  banner: string | null;
  contacts?: BusinessContact[];
  socials?: BusinessSocial[];
  opening_hours?: BusinessOpeningHour[];
  closures?: BusinessClosure[];
  addresses?: BusinessAddress[];
  categories?: Category[];
  amenities?: Amenity[];
  images?: BusinessImage[];
  is_claimed: boolean;
  claimed_at: string | null;
  /** Owner-set visibility. */
  is_published: boolean;
  /** Operator lock (moderation override): frozen for the owner + hidden from public. */
  is_locked: boolean;
  /**
   * The publish-readiness checklist — present on the detail response (omitted from the list). The API
   * owns this: `is_publishable` gates going live, and the API refuses a publish that doesn't meet it.
   */
  readiness?: BusinessReadiness;
  created_at: string | null;
  updated_at: string | null;
}

/** A single minimum-bar requirement and whether the business currently meets it. */
export interface BusinessRequirement {
  key: string;
  met: boolean;
}

export interface BusinessReadiness {
  is_publishable: boolean;
  requirements: BusinessRequirement[];
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  type: z.enum(["company", "self_employed"]),
});

/**
 * BFF: the businesses the signed-in user owns. Forwards to the API's token-scoped
 * `GET /businesses`; on any upstream failure it returns an empty list so the page can render
 * its empty state rather than crash.
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{
    businesses?: Business[];
    retry_after?: number | null;
    message?: string;
  }>({
    method: "GET",
    path: "/businesses",
  });

  if (response.ok) {
    return NextResponse.json({ businesses: response.data.businesses ?? [] });
  }

  // Surface throttling as a real 429 (with the wait) rather than an empty list — an empty list
  // reads as "you have no businesses", which is exactly the dead screen the user hit.
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }

  return NextResponse.json({ businesses: [] }, { status: response.status });
}

const reorderSchema = z.object({
  slugs: z.array(z.string()).min(1).max(200),
});

/**
 * BFF: persist the signed-in user's chosen order of their businesses. A collection-level PATCH (the
 * API deliberately keeps reorder off the `/businesses/{slug}` space so a business slugged "reorder"
 * can't collide). Forwards the ordered slug list; a slug the user doesn't own is a 404 relayed as-is.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  const parsed = reorderSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{
    status?: string;
    retry_after?: number | null;
    message?: string;
  }>({
    method: "PATCH",
    path: "/businesses",
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok" });
  }

  if (response.status === 429) {
    return rateLimitedResponse(response);
  }

  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ status: "error" }, { status: 502 });
}

/**
 * BFF: create a business owned by the signed-in user. Forwards to the API's token-scoped
 * `POST /businesses` and returns the created business (the API's flat `{business}` envelope) so
 * the client can route to it. A 422 passes the API's `errors` bag straight through for inline
 * field feedback; any other upstream failure becomes a 502.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{
    business?: Business;
    message?: string;
    errors?: Record<string, string[]>;
    retry_after?: number | null;
  }>({
    method: "POST",
    path: "/businesses",
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({
      status: "ok",
      business: response.data.business,
    });
  }

  if (response.status === 429) {
    return rateLimitedResponse(response);
  }

  return NextResponse.json(
    {
      status: "invalid",
      message: response.data.message,
      errors: response.data.errors,
    },
    { status: response.status === 422 ? 422 : 502 },
  );
}
