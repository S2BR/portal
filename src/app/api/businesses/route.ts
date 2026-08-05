import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  type: z.enum(["company", "self_employed"]),
});

/**
 * BFF: create a business owned by the signed-in user. Forwards to the API's token-scoped
 * `POST /businesses` and returns the created business (the API's flat `{business}` envelope) so
 * the client can route to it. A 422 passes the API's `errors` bag straight through for inline
 * field feedback; any other upstream failure becomes a 502.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{
    business?: unknown;
    message?: string;
    errors?: Record<string, string[]>;
  }>({
    method: "POST",
    path: "/businesses",
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({
      status: "ok",
      business: response.data.business,
    });
  }

  return NextResponse.json(
    {
      status: "invalid",
      message: response.data.message,
      errors: response.data.errors,
    },
    { status: response.status === 422 ? 422 : 502 },
  );
}
