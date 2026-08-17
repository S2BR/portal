import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

const bodySchema = z.object({
  reason: z.enum(["spam", "offensive", "fake", "other"]),
});

/** BFF: flag a review for an operator. Idempotent per user upstream. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
): Promise<NextResponse> {
  const { slug, id } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{
    retry_after?: number | null;
    message?: string;
  }>({
    method: "POST",
    path: `/businesses/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(id)}/report`,
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({ status: "reported" });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(
    { status: "error" },
    { status: response.status === 404 ? 404 : 502 },
  );
}
