import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { CatalogProduct } from "../../route";

/**
 * BFF: reorder a business's highlighted (featured) products — the order of the profile highlights
 * strip. Forwards the ordered listing ids to the owner-scoped API (a business the caller doesn't own
 * 404s); returns the updated catalog.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as { ids?: string[] };

  const response = await callWithAuth<{
    products: CatalogProduct[];
    retry_after?: number | null;
  }>({
    method: "PUT",
    path: `/businesses/${encodeURIComponent(slug)}/products/featured/reorder`,
    body: { ids: body.ids ?? [] },
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
  return NextResponse.json({ status: "error" }, { status: 502 });
}
