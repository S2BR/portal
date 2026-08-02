import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({ password: z.string().min(1) });

/**
 * BFF: replace the account's 2FA recovery codes with a fresh set (password-gated).
 * A 409 means 2FA isn't enabled, so there's nothing to regenerate.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{ recovery_codes?: string[] } & ApiError>(
    {
      method: "POST",
      path: "/account/security/two-factor/recovery-codes",
      body: parsed.data,
    },
  );

  if (response.ok) {
    return NextResponse.json({
      status: "ok",
      recoveryCodes: response.data.recovery_codes ?? [],
    });
  }

  if (response.status === 409) {
    return NextResponse.json(
      { status: "two_factor_not_enabled" },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { status: "invalid", message: response.data.message },
    { status: 422 },
  );
}
