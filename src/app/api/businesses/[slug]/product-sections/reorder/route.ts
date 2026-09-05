import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { ProductSection } from "../route";

interface ReorderBody {
  ids: string[];
}

/**
 * BFF: reorder a business's product sections (owner) — forwards the ordered section ids to the owner
 * API and returns the sections in their new order.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as ReorderBody;

  const response = await callWithAuth<{
    sections: ProductSection[];
    retry_after?: number | null;
  }>({
    method: "PUT",
    path: `/businesses/${encodeURIComponent(slug)}/product-sections/reorder`,
    body,
  });

  if (response.ok) {
    return NextResponse.json({
      status: "ok",
      sections: response.data.sections,
    });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
