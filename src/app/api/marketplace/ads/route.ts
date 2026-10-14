import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { portalFetch } from "@/lib/api/client";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { AdsPage, MarketplaceAd } from "@/lib/marketplace/types";

const EMPTY_PAGE: AdsPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

/**
 * BFF: a page of the public marketplace directory (unauthenticated) — forwards `q` + `page`. Used by the
 * browse page's "load more".
 */
export async function GET(request: Request): Promise<NextResponse> {
  const incoming = new URL(request.url).searchParams;
  const forwarded = new URLSearchParams();
  for (const key of ["q", "page"] as const) {
    const value = incoming.get(key);
    if (value) {
      forwarded.set(key, value);
    }
  }
  const suffix = forwarded.toString();

  const response = await portalFetch<AdsPage>({
    method: "GET",
    path: `/marketplace/ads${suffix ? `?${suffix}` : ""}`,
  });

  return NextResponse.json(response.ok ? response.data : EMPTY_PAGE);
}

/** The API's write response for an ad (resource on success, or a Laravel validation bag). */
interface AdWriteResponse {
  data?: MarketplaceAd;
  message?: string;
  errors?: Record<string, string[]>;
  retry_after?: number | null;
}

/**
 * BFF: post a new ad (owner). Relays the API's field-level validation errors for inline feedback.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (body === null || typeof body !== "object") {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<AdWriteResponse>({
    method: "POST",
    path: "/marketplace/ads",
    body,
  });

  if (response.ok) {
    return NextResponse.json(
      { status: "ok", ad: response.data.data },
      { status: 201 },
    );
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
  if (response.status === 403) {
    return NextResponse.json({ status: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
