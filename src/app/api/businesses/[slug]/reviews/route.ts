import { NextResponse } from "next/server";

import { portalFetch } from "@/lib/api/client";

import type { PublicReviewsPage } from "@/lib/public-business";

const EMPTY: PublicReviewsPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

/**
 * BFF: a page of a business's PUBLIC reviews — unauthenticated passthrough, used by the profile's
 * "load more". Degrades to an empty page on failure so the section stays intact.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const page = new URL(request.url).searchParams.get("page");
  const suffix = page && page !== "1" ? `?page=${encodeURIComponent(page)}` : "";

  const response = await portalFetch<PublicReviewsPage>({
    method: "GET",
    path: `/public/businesses/${encodeURIComponent(slug)}/reviews${suffix}`,
  });

  return NextResponse.json(response.ok ? response.data : EMPTY);
}
