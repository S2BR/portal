import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { AdminProduct } from "../../route";

/**
 * BFF: merge this product (the source) into another (`into`, the target) — the target survives with
 * the source's SKUs/images/categories, the source is soft-deleted. Forwards to the admin API
 * (super_admin enforced — a 403 surfaces here).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { into?: string };

  const response = await callWithAuth<
    { product: AdminProduct } & {
      errors?: Record<string, string[]>;
      retry_after?: number | null;
    }
  >({ method: "POST", path: `/admin/products/${encodeURIComponent(id)}/merge`, body });

  if (response.ok) {
    return NextResponse.json({ status: "ok", product: response.data.product });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  if (response.status === 422) {
    return NextResponse.json(
      { status: "invalid", errors: response.data.errors },
      { status: 422 },
    );
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
