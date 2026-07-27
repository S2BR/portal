import { NextResponse } from "next/server";

import { portalFetch } from "@/lib/api/client";
import type { CaptchaChallenge } from "@/lib/api/types";

/**
 * BFF: fetch a captcha challenge from the portal for a browser flow. Resilient —
 * if the portal endpoint is unavailable or errors, we report "not required" so
 * sign-in/registration still work (captcha simply isn't enforced client-side
 * until the endpoint is live and captcha is turned on).
 */
export async function GET(request: Request): Promise<NextResponse> {
  const context = new URL(request.url).searchParams.get("context");
  if (context !== "login" && context !== "register") {
    return NextResponse.json({ required: false });
  }

  try {
    const response = await portalFetch<CaptchaChallenge>({
      path: `/auth/captcha?context=${context}`,
    });
    return NextResponse.json(response.ok ? response.data : { required: false });
  } catch {
    return NextResponse.json({ required: false });
  }
}
