import { NextResponse } from "next/server";
import { z } from "zod";

import { portalErrorMessage, portalFetch } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({
  email: z.email(),
  delivery: z.enum(["code", "link"]).optional(),
});

/**
 * BFF: request a passwordless sign-in code (or magic link). Enumeration-safe on
 * the API — the response is identical whether or not the address has an account —
 * so a 200 always advances the client to the code step.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await portalFetch<
    { retry_after?: number } & Partial<ApiError>
  >({
    method: "POST",
    path: "/auth/login/email",
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({
      status: "code_sent",
      email: parsed.data.email,
      retry_after: response.data.retry_after ?? null,
    });
  }

  if (response.status === 429) {
    return NextResponse.json(
      { status: "rate_limited", message: response.data.message },
      { status: 429 },
    );
  }

  return NextResponse.json(
    { status: "invalid", message: portalErrorMessage(response) },
    { status: 422 },
  );
}
