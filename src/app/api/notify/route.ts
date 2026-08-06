import { NextResponse } from "next/server";
import { z } from "zod";

import { portalErrorMessage, portalFetch } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  // The active UI locale, so the API notifies people in their language.
  locale: z.string().optional(),
  // Captcha answer ("<challenge_id>~<answer>"), when the launch flow is gated.
  captcha_token: z.string().optional(),
});

/**
 * BFF handler for the landing's "notify me at launch" form. Forwards to the public API waitlist
 * endpoint (no auth). The API is collect-only and idempotent, so a repeat signup still returns
 * success.
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

  const response = await portalFetch<ApiError & { subscribed?: boolean }>({
    method: "POST",
    path: "/launch/subscribe",
    body: payload,
  });

  if (response.status === 200) {
    return NextResponse.json({ status: "subscribed" });
  }

  if (response.status === 429) {
    return NextResponse.json(
      { status: "rate_limited", message: response.data.message },
      { status: 429 },
    );
  }

  // A captcha failure is surfaced distinctly so the form can re-issue a fresh challenge.
  if (response.data.errors?.captcha_token) {
    return NextResponse.json(
      { status: "captcha_failed", message: response.data.message },
      { status: 422 },
    );
  }

  return NextResponse.json(
    {
      status: "invalid",
      message: portalErrorMessage(response),
      errors: response.data.errors,
    },
    { status: 422 },
  );
}
