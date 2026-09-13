import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { PublicCart } from "@/lib/public-business";

const bodySchema = z.object({
  product_id: z.string().min(1),
  quantity: z.number().int().min(1).max(999),
});

/** BFF: add a product (by public id) to the shopper's cart, or bump its quantity. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{
    cart?: PublicCart;
    retry_after?: number | null;
    message?: string;
  }>({
    method: "POST",
    path: `/businesses/${encodeURIComponent(slug)}/cart/items`,
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({ cart: response.data.cart ?? null });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(
    { status: response.status === 422 ? "unavailable" : "error" },
    {
      status:
        response.status === 404 ? 404 : response.status === 422 ? 422 : 502,
    },
  );
}
