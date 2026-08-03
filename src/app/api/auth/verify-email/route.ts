import { NextResponse } from "next/server";
import { z } from "zod";

import { portalFetch } from "@/lib/api/client";
import type { ApiError, SignInResponse } from "@/lib/api/types";
import { establishSession } from "@/lib/auth/accounts";

const bodySchema = z.object({
  email: z.email(),
  code: z.string().min(1),
});

/**
 * BFF email-verification handler. On success this mints the first token pair,
 * which we store in httpOnly cookies — the user is now signed in.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await portalFetch<SignInResponse & Partial<ApiError>>({
    method: "POST",
    path: "/auth/verify-email",
    body: parsed.data,
  });

  if (response.ok) {
    await establishSession(response.data, response.data.user.id);
    return NextResponse.json({ status: "authenticated" });
  }

  return NextResponse.json(
    { status: "invalid", message: response.data.message },
    { status: 422 },
  );
}
