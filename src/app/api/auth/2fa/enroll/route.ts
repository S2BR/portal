import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

/** BFF: begin 2FA enrollment — returns the TOTP secret + otpauth URL for a QR. */
export async function POST(): Promise<NextResponse> {
  const response = await callWithAuth<
    { secret: string; otpauth_url: string } & ApiError
  >({
    method: "POST",
    path: "/account/security/two-factor/enroll",
  });

  if (response.ok) {
    return NextResponse.json({
      secret: response.data.secret,
      otpauthUrl: response.data.otpauth_url,
    });
  }

  return NextResponse.json(
    { status: "error", message: response.data.message },
    { status: response.status === 409 ? 409 : 400 },
  );
}
