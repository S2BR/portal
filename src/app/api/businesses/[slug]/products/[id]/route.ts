import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { CatalogSighting } from "../route";

/** Editing a catalog entry — the price/availability the owner controls (the product itself is fixed). */
interface UpdateBody {
  price?: number | null;
  currency?: string | null;
  location_label?: string | null;
  unavailable?: boolean;
}

/**
 * BFF: update or remove one product in a business's catalog (a sighting). Forwards to the owner API,
 * which scopes the sighting to the business the caller owns (a foreign one 404s).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
): Promise<NextResponse> {
  const { slug, id } = await params;
  const body = (await request.json().catch(() => ({}))) as UpdateBody;

  const response = await callWithAuth<
    { product: CatalogSighting } & {
      errors?: Record<string, string[]>;
      retry_after?: number | null;
    }
  >({
    method: "PATCH",
    path: `/businesses/${encodeURIComponent(slug)}/products/${encodeURIComponent(id)}`,
    body,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok", product: response.data.product });
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
): Promise<NextResponse> {
  const { slug, id } = await params;

  const response = await callWithAuth<{ retry_after?: number | null }>({
    method: "DELETE",
    path: `/businesses/${encodeURIComponent(slug)}/products/${encodeURIComponent(id)}`,
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
