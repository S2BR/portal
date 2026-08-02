import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import { flattenCollection } from "@/lib/api/types";
import type { ApiError, JsonApiCollection } from "@/lib/api/types";

/** The `passkeys` JSON:API resource attributes returned by the api. */
interface PasskeyAttributes {
  name: string;
  last_used_at: string | null;
  created_at: string | null;
}

/** BFF: list the signed-in account's passkeys. */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<
    JsonApiCollection<PasskeyAttributes> & ApiError
  >({
    method: "GET",
    path: "/account/security/passkeys",
  });

  if (response.ok) {
    return NextResponse.json({ passkeys: flattenCollection(response.data) });
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
    path: "/account/security/passkeys",
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
