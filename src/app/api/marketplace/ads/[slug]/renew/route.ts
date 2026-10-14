import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { MarketplaceAd } from "@/lib/marketplace/types";

/** BFF: renew an ad the caller owns (resets its expiry; un-expires it). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const response = await callWithAuth<{
    data?: MarketplaceAd;
    retry_after?: number | null;
  }>({
    method: "POST",
    path: `/marketplace/ads/${encodeURIComponent(slug)}/renew`,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok", ad: response.data.data });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
