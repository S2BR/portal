import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";

import type { MarketplaceAd } from "@/lib/marketplace/types";

/** BFF: fetch one of the caller's own ads (any status) — for the edit page. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const response = await callWithAuth<{ data?: MarketplaceAd }>({
    method: "GET",
    path: `/marketplace/my-ads/${encodeURIComponent(slug)}`,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok", ad: response.data.data });
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
