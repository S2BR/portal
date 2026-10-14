import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";

import type { MarketplaceAd } from "@/lib/marketplace/types";

/** BFF: reorder an owned ad's photos (first = cover). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as { ids?: unknown };

  if (!Array.isArray(body.ids)) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{ data?: MarketplaceAd }>({
    method: "POST",
    path: `/marketplace/ads/${encodeURIComponent(slug)}/images/reorder`,
    body: { ids: body.ids },
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok", ad: response.data.data });
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
