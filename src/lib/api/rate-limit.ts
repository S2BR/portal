import "server-only";

import { NextResponse } from "next/server";

import type { PortalResponse } from "./client";

/** The rate-limit fields the API puts in its 429 body (`{status:'rate_limited', retry_after, …}`). */
export interface RateLimitBody {
  retry_after?: number | null;
  message?: string;
}

/**
 * Build the BFF's 429 response from an upstream rate-limited call, in the shape the client reads:
 * `{status:'rate_limited', retry_after, message}`. The wait comes from the API's body field, with
 * the `Retry-After` header (captured by `portalFetch`) as a fallback; it's echoed on the header too
 * so any non-JS consumer still sees it. Call this whenever an upstream call returns 429 instead of
 * collapsing it into an empty list or a generic 502 (which is what hid throttling from the user).
 */
export function rateLimitedResponse(
  response: PortalResponse<RateLimitBody>,
): NextResponse {
  const retryAfter = response.data.retry_after ?? response.retryAfter ?? null;

  return NextResponse.json(
    {
      status: "rate_limited",
      retry_after: retryAfter,
      message: response.data.message,
    },
    {
      status: 429,
      headers:
        retryAfter !== null ? { "Retry-After": String(retryAfter) } : undefined,
    },
  );
}
