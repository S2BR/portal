import { NextResponse } from "next/server";
import { z } from "zod";

import { establishSession } from "@/lib/auth/accounts";
import { portalFetch } from "@/lib/api/client";
import type { ApiError, SignInResponse } from "@/lib/api/types";

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  two_factor_code: z.string().optional(),
  captcha_token: z.string().optional(),
});

/**
 * BFF login handler. Forwards credentials to the portal, and on success stores
 * the token pair in httpOnly cookies (the browser never sees a token). Portal
 * step responses (403 `two_factor_required` / `email_unverified`) are relayed as
 * a 200 with a `status` the client branches on; validation/credential failures
 * collapse to a generic 422.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  // Drop empty/absent optionals so the portal never validates blank codes.
  const payload = Object.fromEntries(
    Object.entries(parsed.data).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );

  const response = await portalFetch<SignInResponse & Partial<ApiError>>({
    method: "POST",
    path: "/auth/login",
    body: payload,
  });

  if (response.ok) {
    await establishSession(response.data, response.data.user.id);
    return NextResponse.json({ status: "authenticated" });
  }

  const step = response.data.status;
  if (
    response.status === 403 &&
    (step === "two_factor_required" || step === "email_unverified")
  ) {
    return NextResponse.json({ status: step, email: parsed.data.email });
  }

  if (response.status === 429) {
    return NextResponse.json(
      { status: "rate_limited", message: response.data.message },
      { status: 429 },
    );
  }

  // Captcha is validated before credentials, so a captcha failure must not be
  // reported as a credential failure.
  if (response.data.errors?.captcha_token) {
    return NextResponse.json(
      { status: "captcha_failed", message: response.data.message },
      { status: 422 },
    );
  }

  // A wrong second factor (TOTP) is a code error, not a credential error —
  // keep the user on the code step with the right message.
  if (response.data.errors?.two_factor_code) {
    return NextResponse.json(
      { status: "invalid_code", message: response.data.message },
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
