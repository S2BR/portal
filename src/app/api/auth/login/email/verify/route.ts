import { NextResponse } from "next/server";
import { z } from "zod";

import { portalErrorMessage, portalFetch } from "@/lib/api/client";
import type { ApiError, SignInResponse } from "@/lib/api/types";
import { setSessionCookies } from "@/lib/auth/session";

const bodySchema = z
  .object({
    email: z.email(),
    code: z.string().optional(),
    // Magic-link fields (the deep link carries a signed token instead of a typed code).
    token: z.string().optional(),
    expires: z.number().int().optional(),
    signature: z.string().optional(),
    two_factor_code: z.string().optional(),
  })
  .refine((value) => Boolean(value.code) || Boolean(value.token), {
    message: "code_or_token_required",
  });

/**
 * BFF: complete a passwordless sign-in with the emailed code (or a magic-link
 * token). On success the token pair is stored in httpOnly cookies. A 2FA-enabled
 * account returns `two_factor_required` first — the client re-submits with a
 * `two_factor_code`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  // Drop empty/absent optionals so the API never validates blank fields.
  const payload = Object.fromEntries(
    Object.entries(parsed.data).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );

  const response = await portalFetch<SignInResponse & Partial<ApiError>>({
    method: "POST",
    path: "/auth/login/email/verify",
    body: payload,
  });

  if (response.ok) {
    await setSessionCookies(response.data);
    return NextResponse.json({ status: "authenticated" });
  }

  if (
    response.status === 403 &&
    response.data.status === "two_factor_required"
  ) {
    return NextResponse.json({
      status: "two_factor_required",
      email: parsed.data.email,
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
