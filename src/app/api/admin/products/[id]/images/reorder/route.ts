import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { AdminProduct } from "../../../route";

/**
 * BFF: reorder a product's gallery images (the first is the cover). Forwards the ordered image ids to
 * the admin API (super_admin enforced — a 403 surfaces here); returns the updated product.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { ids?: string[] };

  const response = await callWithAuth<
    { product: AdminProduct } & { retry_after?: number | null }
  >({
    method: "POST",
    path: `/admin/products/${encodeURIComponent(id)}/images/reorder`,
    body: { ids: body.ids ?? [] },
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok", product: response.data.product });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
