import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { Business } from "../../../route";

/**
 * BFF: update a single gallery image's caption. Forwards to the owner-scoped API (a business the
 * caller doesn't own, or an image that isn't its own, 404s); returns the updated business.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; image: string }> },
): Promise<NextResponse> {
  const { slug, image } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    caption?: string | null;
  };

  const response = await callWithAuth<{
    business: Business;
    retry_after?: number | null;
  }>({
    method: "PATCH",
    path: `/businesses/${encodeURIComponent(slug)}/images/${encodeURIComponent(image)}`,
    body: { caption: body.caption ?? null },
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
  if (response.status === 422) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
