import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

/** BFF: list the signed-in account's passkeys. */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ data: unknown[] } & ApiError>({
    method: "GET",
    path: "/auth/passkeys",
  });

  if (response.ok) {
    return NextResponse.json({ passkeys: response.data.data ?? [] });
  }

  return NextResponse.json(
    { status: "error", message: response.data.message },
    { status: 400 },
  );
}

const storeSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(1),
  challenge_id: z.string().min(1),
  // The browser's attestation (RegistrationResponseJSON) — forwarded verbatim.
  credential: z.record(z.string(), z.unknown()),
});

/** BFF: finish passkey registration (password-gated at the portal). */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = storeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<ApiError>({
    method: "POST",
    path: "/auth/passkeys",
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
