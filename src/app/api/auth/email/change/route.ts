import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/**
 * BFF: request an email change (password re-auth). Enumeration-safe on the
 * portal, so a 200 always advances the client to verify the new address.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<ApiError>({
    method: "POST",
    path: "/account/email/change",
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({
      status: "verification_required",
      email: parsed.data.email,
    });
  }

  return NextResponse.json(
    { status: "invalid", message: response.data.message },
    { status: 422 },
  );
}
