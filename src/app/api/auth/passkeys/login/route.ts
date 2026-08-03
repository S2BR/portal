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
 * BFF: verify a passkey assertion and, on success, store the token pair in
 * httpOnly cookies (the browser never sees a token). A passkey is a strong
 * factor on its own, so success signs the user straight in. Public.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await portalFetch<SignInResponse & Partial<ApiError>>({
    method: "POST",
    path: "/auth/passkeys/login",
    body: parsed.data,
  });

  if (response.ok) {
    await establishSession(response.data, response.data.user.id);
    return NextResponse.json({ status: "authenticated" });
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
