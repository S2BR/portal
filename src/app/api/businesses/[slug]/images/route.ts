import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { Business } from "../../route";

/**
 * BFF: reorder a business's gallery images. Forwards the ordered image ids to the owner-scoped API
 * (a business the caller doesn't own 404s); returns the updated business.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as { ids?: string[] };

  const response = await callWithAuth<{
    business: Business;
    retry_after?: number | null;
  }>({
    method: "PATCH",
    path: `/businesses/${encodeURIComponent(slug)}/images`,
    body: { ids: body.ids ?? [] },
  });

  if (response.ok) {
    return NextResponse.json({
      status: "ok",
      business: response.data.business,
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
