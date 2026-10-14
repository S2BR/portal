import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { MarketplaceCategory } from "@/lib/marketplace/types";

/**
 * BFF: one ad category with its field schema (unauthenticated) — used by the post/edit form to render
 * the chosen type's dynamic fields. Returns 404 when the category is unknown or inactive.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const response = await callWithAuth<{ data?: MarketplaceCategory }>({
    method: "GET",
    path: `/marketplace/categories/${encodeURIComponent(slug)}`,
  });

  if (!response.ok || !response.data.data) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ category: response.data.data });
}
