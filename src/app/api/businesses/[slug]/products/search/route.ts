import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** A catalog product as an "add a product" search result — with its SKU variants to pick from. */
export interface CatalogMatch {
  id: string;
  name: string;
  brand: string | null;
  is_homemade: boolean;
  variants: {
    id: string;
    label: string | null;
    size: string | null;
    barcode: string | null;
  }[];
}

/**
 * BFF: search the global catalog to add a product to a business (by name or barcode). Gated on
 * ownership of the business by the owner API.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const suffix = query ? `?q=${encodeURIComponent(query)}` : "";

  const response = await callWithAuth<{
    products: CatalogMatch[];
    retry_after?: number | null;
  }>({
    method: "GET",
    path: `/businesses/${encodeURIComponent(slug)}/products/search${suffix}`,
  });

  if (response.ok) {
    return NextResponse.json({ products: response.data.products });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json({ products: [] }, { status: 502 });
}
