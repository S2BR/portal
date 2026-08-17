import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { PublicReview } from "@/lib/public-business";

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).nullish(),
});

type MyReview = Pick<PublicReview, "id" | "rating" | "body" | "owner_reply">;

/** BFF: the signed-in user's own review of a business (or null) — prefills the write form. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const response = await callWithAuth<{
    review?: MyReview | null;
    retry_after?: number | null;
    message?: string;
  }>({
    method: "GET",
    path: `/businesses/${encodeURIComponent(slug)}/review`,
  });

  if (response.ok) {
    return NextResponse.json({ review: response.data.review ?? null });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(
    { status: "error" },
    { status: response.status === 404 ? 404 : 502 },
  );
}

/** BFF: create or update the signed-in user's review (one per business). */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{
    review?: MyReview;
    retry_after?: number | null;
    message?: string;
  }>({
    method: "PUT",
    path: `/businesses/${encodeURIComponent(slug)}/review`,
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok", review: response.data.review });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  // 403 = trying to review your own business; 404 = business not publicly visible.
  if (response.status === 403) {
    return NextResponse.json(
      { status: "forbidden", message: response.data.message },
      { status: 403 },
    );
  }
  return NextResponse.json(
    { status: "invalid", message: response.data.message },
    { status: response.status === 404 ? 404 : 422 },
  );
}

/** BFF: remove the signed-in user's review. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const response = await callWithAuth<{
    retry_after?: number | null;
    message?: string;
  }>({
    method: "DELETE",
    path: `/businesses/${encodeURIComponent(slug)}/review`,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok" });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
