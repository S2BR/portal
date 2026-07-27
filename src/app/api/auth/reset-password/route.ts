import { NextResponse } from "next/server";
import { z } from "zod";

import { portalFetch } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({
  email: z.email(),
  code: z.string().min(1),
  password: z.string().min(1),
  password_confirmation: z.string().min(1),
});

/**
 * BFF reset-password handler. On success the portal revokes all of the user's
 * sessions, so the client is sent back to sign in with the new password.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await portalFetch<ApiError>({
    method: "POST",
    path: "/auth/password/reset",
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok" });
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
