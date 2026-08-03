import { NextResponse } from "next/server";
import { z } from "zod";

import { portalErrorMessage, portalFetch } from "@/lib/api/client";
import type { ApiError, SignInResponse } from "@/lib/api/types";
import { setSessionCookies } from "@/lib/auth/session";

const bodySchema = z.object({
  pending_token: z.string().min(1),
  two_factor_code: z.string().min(1),
});

/**
 * BFF: complete the second step of a 2FA-gated passwordless sign-in — exchange the single-use
 * pending token (from `/login/email/verify`) plus the authenticator/recovery code for a
 * session. On success the token pair is stored in httpOnly cookies. A bad code can be retried
 * with the same pending token until it burns.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await portalFetch<SignInResponse & Partial<ApiError>>({
    method: "POST",
    path: "/auth/login/email/two-factor",
    body: parsed.data,
  });

  if (response.ok) {
    await setSessionCookies(response.data);
    return NextResponse.json({ status: "authenticated" });
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
