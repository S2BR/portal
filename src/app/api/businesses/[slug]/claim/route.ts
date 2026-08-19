import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

const bodySchema = z.object({
  message: z.string().max(2000).nullish(),
  proof: z.array(z.string().max(1024)).max(6).optional(),
});

/**
 * BFF: submit a claim to own a business. Signed-in users only (upstream). A verified email match is
 * auto-approved by the API; otherwise the claim is queued for review. Relays the created claim so the
 * client can reflect its status.
 */
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
    data?: { status?: string; method?: string };
    message?: string;
    errors?: Record<string, string[]>;
    retry_after?: number | null;
  }>({
    method: "POST",
    path: `/businesses/${encodeURIComponent(slug)}/claim`,
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok", claim: response.data.data });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(
    {
      status: "invalid",
      message: response.data.message,
      errors: response.data.errors,
    },
    { status: response.status === 422 ? 422 : 502 },
  );
}
