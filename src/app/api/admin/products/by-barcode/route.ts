import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** The product that already owns a barcode — across every state (private, unapproved, soft-deleted). */
export interface BarcodeOwner {
  id: string;
  name: string;
  moderation_status: string;
  is_shared: boolean;
  is_deleted: boolean;
}

/**
 * BFF: resolve a SKU barcode to the product that already carries it, from the DATABASE (super_admin
 * enforced) — authoritative across private / unapproved / soft-deleted products the search index
 * can't see. Lets the editor point the operator to the owner of a colliding barcode. A blip degrades
 * to `found: false` so the editor stays usable.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const barcode = new URL(request.url).searchParams.get("barcode") ?? "";

  if (barcode.trim() === "") {
    return NextResponse.json({ found: false, product: null }, { status: 400 });
  }

  const response = await callWithAuth<{
    found: boolean;
    product: BarcodeOwner | null;
    retry_after?: number | null;
  }>({
    method: "GET",
    path: `/admin/products/by-barcode?barcode=${encodeURIComponent(barcode)}`,
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
