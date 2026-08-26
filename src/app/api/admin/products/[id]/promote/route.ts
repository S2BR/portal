import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { AdminProduct } from "../../route";

/**
 * BFF: promote a private product into the shared base catalog. Forwards to the admin API (super_admin
 * enforced — a 403 surfaces here).
 */
export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const response = await callWithAuth<{
    product: AdminProduct;
    retry_after?: number | null;
  }>({
    method: "PUT",
    path: `/admin/products/${encodeURIComponent(id)}/promote`,
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
