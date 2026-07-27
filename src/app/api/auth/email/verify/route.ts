import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({ code: z.string().min(1) });

/**
 * BFF: confirm an email change with the code sent to the new address. The
 * portal signs out other sessions on success.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<ApiError>({
    method: "POST",
    path: "/auth/email/verify",
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok" });
  }

  return NextResponse.json(
    { status: "invalid", message: response.data.message },
    { status: 422 },
  );
}
