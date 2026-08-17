import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** A review as its owner triages it — the public fields plus the moderation flags. */
export interface OwnerReview {
  id: string;
  rating: number;
  body: string | null;
  reviewer: { name: string | null; avatar: string | null };
  owner_reply: string | null;
  owner_replied_at: string | null;
  is_hidden: boolean;
  report_count: number;
  created_at: string | null;
}

export interface OwnerReviewsPage {
  data: OwnerReview[];
  meta: { current_page: number; last_page: number; total: number };
}

const EMPTY: OwnerReviewsPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

/**
 * BFF: every review on a business the signed-in user owns (hidden ones included), for the owner's
 * reviews page. Degrades to an empty page on failure so the surface stays intact.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const page = new URL(request.url).searchParams.get("page");
  const suffix = page && page !== "1" ? `?page=${encodeURIComponent(page)}` : "";

  const response = await callWithAuth<
    OwnerReviewsPage & { retry_after?: number | null; message?: string }
  >({
    method: "GET",
    path: `/businesses/${encodeURIComponent(slug)}/reviews${suffix}`,
  });

  if (response.ok) {
    return NextResponse.json({ data: response.data.data, meta: response.data.meta });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(EMPTY, {
    status: response.status === 404 ? 404 : 502,
  });
}
