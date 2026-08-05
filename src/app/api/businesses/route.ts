import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";

export type BusinessType = "company" | "self_employed";

export interface BusinessContact {
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

export interface BusinessAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface BusinessMetadata {
  contact?: BusinessContact | null;
  address?: BusinessAddress | null;
}

/** A business as returned by the API's flat `{business}` / `{businesses}` envelopes. */
export interface Business {
  id: number;
  slug: string;
  name: string;
  type: BusinessType;
  headline: string | null;
  description: string | null;
  metadata: BusinessMetadata | null;
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
