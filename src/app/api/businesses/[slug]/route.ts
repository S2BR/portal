import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { Business } from "../route";

// Loose shape only — the API owns format validation (email, url, 2-letter country) and returns
// field-level messages, so the BFF stays a thin guard rather than masking them as a generic 422.
const contactSchema = z.object({
  // Public code of an existing row (round-tripped to update it in place); absent for a new row.
  id: z.string().optional(),
  type: z.string(),
  value: z.string(),
  name: z.string().nullish(),
  meta: z.record(z.string(), z.unknown()).nullish(),
});

const socialSchema = z.object({
  id: z.string().optional(),
  platform: z.string(),
  handle: z.string(),
});

const openingHourSchema = z.object({
  day_of_week: z.string(),
  open_time: z.string().nullish(),
  close_time: z.string().nullish(),
  closed_all_day: z.boolean(),
});

const closureSchema = z.object({
  id: z.string().optional(),
  name: z.string().nullish(),
  start_date: z.string(),
  end_date: z.string(),
  is_recurring: z.boolean().optional(),
  hours: z
    .array(z.object({ open: z.string(), close: z.string() }))
    .optional(),
});

const addressSchema = z.object({
  id: z.string().optional(),
  address_1: z.string().optional(),
  address_2: z.string().nullish(),
  apartment_suite: z.string().nullish(),
  city: z.string().optional(),
  state_province: z.string().nullish(),
  postal_code: z.string().nullish(),
  country: z.string().optional(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  notes: z.string().nullish(),
  is_main: z.boolean().optional(),
  is_hidden: z.boolean().optional(),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    type: z.enum(["company", "self_employed"]).optional(),
    headline: z.string().max(255).nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
    // IANA zone governing the business's hours; the API validates it against the system zone list.
    timezone: z.string().max(64).nullable().optional(),
    // Owner visibility toggle.
    published: z.boolean().optional(),
    category_suggestion: z.string().max(500).nullable().optional(),
    colors: z.object({ primary: z.string().nullish() }).nullable().optional(),
    contacts: z.array(contactSchema).optional(),
    socials: z.array(socialSchema).optional(),
    opening_hours: z.array(openingHourSchema).optional(),
    closures: z.array(closureSchema).optional(),
    addresses: z.array(addressSchema).optional(),
    category_ids: z.array(z.number()).optional(),
    amenity_ids: z.array(z.number()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "empty" });

/**
 * BFF: a single business the signed-in user owns, resolved by slug. Forwards to the API's
 * token-scoped `GET /businesses/{slug}`; a slug the user doesn't own is a 404 upstream and
 * relayed as one.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const response = await callWithAuth<{
    business?: Business;
    status?: string;
    retry_after?: number | null;
    message?: string;
  }>({
    method: "GET",
    path: `/businesses/${encodeURIComponent(slug)}`,
  });

  if (response.ok) {
    return NextResponse.json({ business: response.data.business });
  }

  if (response.status === 429) {
    return rateLimitedResponse(response);
  }

  // An operator-locked listing (403) — relay the marker so the workspace shows the lock notice
  // rather than the generic "something went wrong". The API serves no business data here.
  if (
    response.status === 403 &&
    response.data?.status === "business_locked"
  ) {
    return NextResponse.json({ status: "business_locked" }, { status: 403 });
  }

  return NextResponse.json(
    { status: "error" },
    { status: response.status === 404 ? 404 : 502 },
  );
}

/**
 * BFF: update a business the user owns. A partial PATCH — only the sent fields are applied.
 * `metadata` is replaced wholesale by the API, so the client sends the full bag. A 422 relays
 * the API's field errors; a 404 (not owned / gone) is relayed as-is.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{
    business?: Business;
    message?: string;
    errors?: Record<string, string[]>;
    retry_after?: number | null;
  }>({
    method: "PATCH",
    path: `/businesses/${encodeURIComponent(slug)}`,
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

  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
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

/**
 * BFF: soft-delete a business the user owns. The API returns 204; a slug the user doesn't own
 * is a 404 relayed as-is.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const response = await callWithAuth<{
    message?: string;
    retry_after?: number | null;
  }>({
    method: "DELETE",
    path: `/businesses/${encodeURIComponent(slug)}`,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok" });
  }

  if (response.status === 429) {
    return rateLimitedResponse(response);
  }

  return NextResponse.json(
    { status: "error" },
    { status: response.status === 404 ? 404 : 502 },
  );
}
