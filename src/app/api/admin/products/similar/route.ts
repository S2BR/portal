import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** A near-duplicate catalog product the operator could add a SKU to, from the dedup lookup. */
export interface SimilarProduct {
  id: string;
  name: string;
  brand: string | null;
  family: string | null;
  sku_count: number;
  barcodes: string[];
}

/**
 * BFF: "does a similar product already exist?" — forwards name/brand/exclude to the admin API
 * (super_admin enforced) so the catalog editor can offer to add a SKU under an existing product
 * instead of duplicating. Degrades to an empty list on a blip so the editor stays usable.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["name", "brand", "exclude"]) {
    const value = incoming.get(key);
    if (value && value.trim() !== "") {
      query.set(key, value.trim());
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const response = await callWithAuth<{ data: SimilarProduct[]; retry_after?: number | null }>({
    method: "GET",
    path: `/admin/products/similar${suffix}`,
  });

  if (response.ok) {
    return NextResponse.json({ data: response.data.data });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json({ data: [] }, { status: response.status === 403 ? 403 : 502 });
}
