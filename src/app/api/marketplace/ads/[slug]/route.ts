import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { MarketplaceAd } from "@/lib/marketplace/types";

interface AdWriteResponse {
  data?: MarketplaceAd;
  message?: string;
  errors?: Record<string, string[]>;
  retry_after?: number | null;
}

/**
 * BFF: update an ad the caller owns. Relays the API's field-level validation errors. A non-owned ad
 * resolves to 404 on the API.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (body === null || typeof body !== "object") {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<AdWriteResponse>({
    method: "PUT",
    path: `/marketplace/ads/${encodeURIComponent(slug)}`,
    body,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok", ad: response.data.data });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 422) {
    return NextResponse.json(
      {
        status: "invalid",
        message: response.data.message,
        errors: response.data.errors,
      },
      { status: 422 },
    );
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}

/** BFF: delete an ad the caller owns. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const response = await callWithAuth({
    method: "DELETE",
    path: `/marketplace/ads/${encodeURIComponent(slug)}`,
  });

  if (response.ok) {
    return new NextResponse(null, { status: 204 });
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
