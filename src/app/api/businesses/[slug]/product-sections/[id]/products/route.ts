import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { ProductSection } from "../../route";

interface SyncBody {
  ids: string[];
}

/**
 * BFF: set (and order) the products in a section (owner) — forwards the ordered sighting ids to the
 * owner API, scoped to the business the caller owns.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
): Promise<NextResponse> {
  const { slug, id } = await params;
  const body = (await request.json().catch(() => ({}))) as SyncBody;

  const response = await callWithAuth<{
    section: ProductSection;
    retry_after?: number | null;
  }>({
    method: "PUT",
    path: `/businesses/${encodeURIComponent(slug)}/product-sections/${encodeURIComponent(id)}/products`,
    body,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok", section: response.data.section });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
