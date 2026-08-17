import { NextResponse } from "next/server";
import { z } from "zod";

import { portalFetch } from "@/lib/api/client";
import type { ApiError, SignInResponse } from "@/lib/api/types";
import { establishSession } from "@/lib/auth/accounts";

const bodySchema = z.object({
  challenge_id: z.string().min(1),
  // The browser's assertion (AuthenticationResponseJSON) — forwarded verbatim.
  credential: z.record(z.string(), z.unknown()),
});

/**
 * BFF: verify a passkey assertion and, on success, store the token pair in httpOnly cookies (the
 * browser never sees a token). Public. When the account has 2FA enabled the passkey is only the
 * primary factor: the API returns `two_factor_required` with a single-use `pending_token`, which we
 * relay so the client can complete the second step at `/api/auth/login/email/two-factor` (shared
 * with the emailed-code flow) — nothing bypasses 2FA.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await portalFetch<
    SignInResponse & { pending_token?: string } & Partial<ApiError>
  >({
    method: "POST",
    path: "/auth/passkeys/login",
    body: parsed.data,
  });

  if (response.ok) {
    await establishSession(response.data, response.data.user.id);
    return NextResponse.json({ status: "authenticated" });
  }

  if (
    response.status === 403 &&
    response.data.status === "two_factor_required"
  ) {
    return NextResponse.json({
      status: "two_factor_required",
      pending_token: response.data.pending_token,
    });
  }

  if (response.status === 429) {
    return NextResponse.json(
      { status: "rate_limited", message: response.data.message },
      { status: 429 },
    );
  }

  return NextResponse.json(
    { status: "invalid", message: response.data.message },
    { status: 422 },
  );
}
