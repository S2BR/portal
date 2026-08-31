import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** A product in a business's catalog — a sighting (price + availability) plus the SKU variant it points at. */
export interface CatalogSighting {
  id: string;
  price: number | null;
  currency: string | null;
  location_label: string | null;
  is_available: boolean;
  status: string;
  variant: {
    id: string;
    label: string | null;
    /** The numeric amount (e.g. "1"), paired with `unit`. */
    size: string | null;
    /** The measure code (e.g. "un"); see @/lib/products/units. */
    unit: string | null;
    barcode: string | null;
    product: {
      id: string;
      name: string;
      brand: string | null;
      is_homemade: boolean;
      image: string | null;
    } | null;
  } | null;
}

/** Adding a product: an existing catalog SKU by variant id, or a new (handmade) product created inline. */
export interface AddCatalogBody {
  variant_id?: string;
  product?: {
    name: string;
    brand?: string | null;
    description?: string | null;
    barcode?: string | null;
    label?: string | null;
    /** The handmade item's quantity: numeric amount + measure code (see @/lib/products/units). */
    size?: string | null;
    unit?: string | null;
  };
  price?: number | null;
  currency?: string | null;
  location_label?: string | null;
  unavailable?: boolean;
}

/**
 * BFF: a business's own product catalog (its sightings). GET lists them; POST adds one. Forwards to the
 * owner API, which resolves the business for the caller (a non-owned slug 404s).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const response = await callWithAuth<{
    products: CatalogSighting[];
    retry_after?: number | null;
  }>({
    method: "GET",
    path: `/businesses/${encodeURIComponent(slug)}/products`,
  });

  if (response.ok) {
    return NextResponse.json({ products: response.data.products });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ products: [] }, { status: 502 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as AddCatalogBody;

  const response = await callWithAuth<
    { product: CatalogSighting } & {
      message?: string;
      errors?: Record<string, string[]>;
      retry_after?: number | null;
    }
  >({
    method: "POST",
    path: `/businesses/${encodeURIComponent(slug)}/products`,
    body,
  });

  if (response.ok) {
    return NextResponse.json(
      { status: "ok", product: response.data.product },
      { status: 201 },
    );
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  if (response.status === 422) {
    return NextResponse.json(
      { status: "invalid", errors: response.data.errors },
      { status: 422 },
    );
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
