import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { BarcodeLookupResult } from "../route";

/**
 * BFF: resolve a barcode against OpenFoodFacts (via the admin API — super_admin enforced) so the
 * catalog editor can prefill a new SKU. `found` is false when the barcode isn't in the public
 * database; a lookup blip degrades to the same shape with a 502 so the editor stays usable.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const barcode = new URL(request.url).searchParams.get("barcode") ?? "";

  if (barcode.trim() === "") {
    return NextResponse.json({ found: false, product: null }, { status: 400 });
  }

  const response = await callWithAuth<{
    found: boolean;
    product: BarcodeLookupResult | null;
    retry_after?: number | null;
  }>({
    method: "GET",
    path: `/admin/products/barcode-lookup?barcode=${encodeURIComponent(barcode)}`,
  });

  if (response.ok) {
    return NextResponse.json({
      found: response.data.found,
      product: response.data.product,
    });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ found: false, product: null }, { status: 502 });
}
