import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({
  method: z.enum(["password", "passkey"]),
  action: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
  password: z.string().min(1).optional(),
  challenge_id: z.string().min(1).optional(),
  // The browser's assertion (AuthenticationResponseJSON) — forwarded verbatim.
  assertion: z.record(z.string(), z.unknown()).optional(),
});

/**
 * BFF: step-up verification. Prove identity for a sensitive action (password, or a
 * passkey assertion) and return a single-use token bound to that action and its params.
 * The token is then carried to the action endpoint. A wrong password / bad assertion is
 * surfaced as a 422 so the dialog can show it and stay open.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<
    { verification_token: string; expires_in: number } & ApiError
  >({
    method: "POST",
    path: "/account/verify",
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({
      verification_token: response.data.verification_token,
      expires_in: response.data.expires_in,
    });
  }

  return NextResponse.json(
    { message: response.data.message, errors: response.data.errors },
    { status: 422 },
  );
}
