import { NextResponse } from "next/server";

import { portalFetch } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/types";

/** BFF: begin a usernameless passkey sign-in — returns request options + a challenge id. Public. */
export async function POST(): Promise<NextResponse> {
  const response = await portalFetch<
    { challenge_id: string; options: unknown } & ApiError
  >({
    method: "POST",
    path: "/auth/passkeys/login/options",
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
