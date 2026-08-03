import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

/**
 * BFF: the step-up verification methods the signed-in account can use right now —
 * always `password`, plus `passkey` when passkeys are enabled and the account has one.
 * The confirmation dialog reads this to decide which options to offer.
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ methods: string[] } & ApiError>({
    method: "GET",
    path: "/account/verify/methods",
  });

  if (response.ok) {
    return NextResponse.json({ methods: response.data.methods });
  }

  // Fail safe: password is always available.
  return NextResponse.json({ methods: ["password"] });
}
