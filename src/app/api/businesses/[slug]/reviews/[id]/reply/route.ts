import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { OwnerReview } from "@/app/api/businesses/[slug]/owner-reviews/route";

const bodySchema = z.object({
  body: z.string().min(1).max(2000),
});

/** BFF: post or edit the owner's single public reply to a review. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
): Promise<NextResponse> {
  const { slug, id } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{
    review?: OwnerReview;
    retry_after?: number | null;
    message?: string;
  }>({
    method: "PUT",
    path: `/businesses/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(id)}/reply`,
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok", review: response.data.review });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(
    { status: "error" },
    { status: response.status === 404 ? 404 : 502 },
  );
}

/** BFF: remove the owner's reply from a review. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
): Promise<NextResponse> {
  const { slug, id } = await params;

  const response = await callWithAuth<{
    retry_after?: number | null;
    message?: string;
  }>({
    method: "DELETE",
    path: `/businesses/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(id)}/reply`,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok" });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(
    { status: "error" },
    { status: response.status === 404 ? 404 : 502 },
  );
}
