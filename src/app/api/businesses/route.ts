import { NextResponse } from "next/server";
import { z } from "zod";

import type { Amenity } from "@/app/api/amenities/route";
import type { Category } from "@/app/api/categories/route";
import { callWithAuth } from "@/lib/api/authed";

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
  type: BusinessContactType;
  value: string;
  name: string | null;
  meta: Record<string, unknown> | null;
}

export interface BusinessSocial {
  platform: BusinessSocialNetwork;
  handle: string;
}

export interface BusinessOpeningHour {
  day_of_week: DayOfWeek;
  open_time: string | null;
  close_time: string | null;
  closed_all_day: boolean;
}

export interface BusinessAddress {
  id: number;
  address_1: string;
  address_2: string | null;
  apartment_suite: string | null;
  city: string;
  state_province: string | null;
  postal_code: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  is_main: boolean;
}

export interface BusinessColors {
  primary: string | null;
}

export interface BusinessImage {
  id: number;
  url: string;
}

/**
 * A business as returned by the API's flat `{business}` / `{businesses}` envelopes. The child
 * collections and address are present on single-business responses and omitted from the list.
 */
export interface Business {
  id: number;
  slug: string;
  name: string;
  type: BusinessType;
  headline: string | null;
  description: string | null;
  colors: BusinessColors | null;
  category_suggestion: string | null;
  // Presigned GET urls (short-lived) for the single logo + banner; null when unset. Always
  // present since they're columns.
  logo: string | null;
  banner: string | null;
  contacts?: BusinessContact[];
  socials?: BusinessSocial[];
  opening_hours?: BusinessOpeningHour[];
  addresses?: BusinessAddress[];
  categories?: Category[];
  amenities?: Amenity[];
  images?: BusinessImage[];
  is_claimed: boolean;
  claimed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
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
  const response = await callWithAuth<{ businesses?: Business[] }>({
    method: "GET",
    path: "/businesses",
  });

  if (response.ok) {
    return NextResponse.json({ businesses: response.data.businesses ?? [] });
  }

  return NextResponse.json({ businesses: [] }, { status: response.status });
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

  return NextResponse.json(
    {
      status: "invalid",
      message: response.data.message,
      errors: response.data.errors,
    },
    { status: response.status === 422 ? 422 : 502 },
  );
}
