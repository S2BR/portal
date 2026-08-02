import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({
  current_password: z.string().min(1),
  password: z.string().min(1),
  password_confirmation: z.string().min(1),
});

/**
 * BFF: change the signed-in account's password. The api requires the current
 * password (a stolen access token alone must not change it) and, on success,
 * signs out every other session — the current one stays.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<ApiError>({
    method: "POST",
    path: "/account/password/change",
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
