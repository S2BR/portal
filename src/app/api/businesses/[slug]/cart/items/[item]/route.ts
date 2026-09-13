import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { PublicCart } from "@/lib/public-business";

const bodySchema = z.object({
  quantity: z.number().int().min(1).max(999),
});

/** BFF: set a cart line's quantity. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; item: string }> },
): Promise<NextResponse> {
  const { slug, item } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{
    cart?: PublicCart;
    retry_after?: number | null;
    message?: string;
  }>({
    method: "PATCH",
    path: `/businesses/${encodeURIComponent(slug)}/cart/items/${encodeURIComponent(item)}`,
    body: parsed.data,
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

/** BFF: remove a cart line. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; item: string }> },
): Promise<NextResponse> {
  const { slug, item } = await params;

  const response = await callWithAuth<{
    cart?: PublicCart;
    retry_after?: number | null;
    message?: string;
  }>({
    method: "DELETE",
    path: `/businesses/${encodeURIComponent(slug)}/cart/items/${encodeURIComponent(item)}`,
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
