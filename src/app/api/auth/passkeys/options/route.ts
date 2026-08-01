import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

/** BFF: begin passkey registration — returns creation options + a single-use challenge id. */
export async function POST(): Promise<NextResponse> {
  const response = await callWithAuth<
    { challenge_id: string; options: unknown } & ApiError
  >({
    method: "POST",
    path: "/auth/passkeys/options",
  });

  if (response.ok) {
    return NextResponse.json({
      challenge_id: response.data.challenge_id,
      options: response.data.options,
    });
  }

  return NextResponse.json(
    { status: "error", message: response.data.message },
    { status: 400 },
  );
}
