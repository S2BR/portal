import { NextResponse } from "next/server";
import { z } from "zod";

import { portalFetch } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(1),
  password_confirmation: z.string().min(1),
  captcha_token: z.string().optional(),
});

/**
 * BFF register handler. The portal is enumeration-safe (a taken email returns
 * the same `verification_required` response), so on 201 we always advance the
 * client to the verify-email step. No tokens are issued until verification.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const payload = Object.fromEntries(
    Object.entries(parsed.data).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );

  const response = await portalFetch<ApiError & { status?: string }>({
    method: "POST",
    path: "/auth/register",
    body: payload,
  });

  if (response.status === 201) {
    return NextResponse.json({
      status: response.data.status ?? "verification_required",
      email: parsed.data.email,
    });
  }

  if (response.status === 429) {
    return NextResponse.json(
      { status: "rate_limited", message: response.data.message },
      { status: 429 },
    );
  }

  // A captcha failure is validated before the rest — surface it distinctly.
  if (response.data.errors?.captcha_token) {
    return NextResponse.json(
      { status: "captcha_failed", message: response.data.message },
      { status: 422 },
    );
  }

  return NextResponse.json(
    {
      status: "invalid",
      message: response.data.message,
      errors: response.data.errors,
    },
    { status: 422 },
  );
}
