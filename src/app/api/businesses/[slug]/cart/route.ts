import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { PublicCart } from "@/lib/public-business";

/** BFF: the signed-in shopper's cart for a store. 404 when the store has no e-commerce enabled. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const response = await callWithAuth<{
    cart?: PublicCart;
    retry_after?: number | null;
    message?: string;
  }>({
    method: "GET",
    path: `/businesses/${encodeURIComponent(slug)}/cart`,
  });

  if (response.ok) {
    return NextResponse.json({ cart: response.data.cart ?? null });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(
    { status: "error" },
    { status: response.status === 404 ? 404 : 502 },
  );
}

/** BFF: empty the cart. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const response = await callWithAuth<{
    cart?: PublicCart;
    retry_after?: number | null;
    message?: string;
  }>({
    method: "DELETE",
    path: `/businesses/${encodeURIComponent(slug)}/cart`,
  });

  if (response.ok) {
    return NextResponse.json({ cart: response.data.cart ?? null });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(
    { status: "error" },
    { status: response.status === 404 ? 404 : 502 },
  );
}
