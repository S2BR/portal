import { NextResponse } from "next/server";
import { z } from "zod";

import { portalFetch } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({ email: z.email() });

/**
 * BFF resend-verification handler. The portal is enumeration-safe here (always
 * 200), so we simply relay the resend cooldown.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await portalFetch<ApiError & { retry_after?: number }>({
    method: "POST",
    path: "/auth/verify-email/resend",
    body: parsed.data,
  });

  return NextResponse.json({
    status: "ok",
    retryAfter: response.data.retry_after ?? null,
  });
}
