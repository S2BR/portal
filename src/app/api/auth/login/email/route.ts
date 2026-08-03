import { NextResponse } from "next/server";
import { z } from "zod";

import { portalErrorMessage, portalFetch } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({
  email: z.email(),
  delivery: z.enum(["code", "link"]).optional(),
  // Captcha answer "<challenge_id>~<answer>" — required only when the email-login gate is on.
  captcha_token: z.string().optional(),
});

/**
 * BFF: request a passwordless sign-in code (or magic link). Enumeration-safe on
 * the API — the response is identical whether or not the address has an account —
 * so a 200 always advances the client to the code step.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  // Drop empty/absent optionals so the API never validates a blank captcha token.
  const payload = Object.fromEntries(
    Object.entries(parsed.data).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );

  const response = await portalFetch<
    { retry_after?: number } & Partial<ApiError>
  >({
    method: "POST",
    path: "/auth/login/email",
    body: payload,
  });

  if (response.ok) {
    return NextResponse.json({
      status: "code_sent",
      email: parsed.data.email,
      retry_after: response.data.retry_after ?? null,
    });
  }

  if (response.status === 429) {
    return NextResponse.json(
      { status: "rate_limited", message: response.data.message },
      { status: 429 },
    );
  }

  // Captcha is validated before the account lookup — surface it distinctly so the client
  // can refresh the challenge and keep the user on the request step.
  if (response.data.errors?.captcha_token) {
    return NextResponse.json(
      { status: "captcha_failed", message: response.data.message },
      { status: 422 },
    );
  }

  return NextResponse.json(
    { status: "invalid", message: portalErrorMessage(response) },
    { status: 422 },
  );
}
