import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({
  code: z.string().min(1),
  password: z.string().min(1),
});

/** BFF: confirm 2FA enrollment with a TOTP code + password; returns recovery codes. */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{ recovery_codes: string[] } & ApiError>({
    method: "POST",
    path: "/account/security/two-factor/confirm",
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({
      status: "ok",
      recoveryCodes: response.data.recovery_codes,
    });
  }

  return NextResponse.json(
    { status: "invalid", message: response.data.message },
    { status: 422 },
  );
}
