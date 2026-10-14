import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { ContactMethod } from "@/lib/marketplace/types";

interface ContactResponse {
  data?: { contact_method: ContactMethod; contact_value: string | null };
  // Present on an upstream 429 body, read by rateLimitedResponse.
  retry_after?: number | null;
  message?: string;
}

/**
 * BFF: reveal a poster's phone/email for a publicly-listed ad. Authenticated — the API keeps contact
 * details off the public ad payload and gates them here behind a signed-in, rate-limited account, so
 * they can't be harvested in bulk. A 401 means the session is gone (the UI prompts to sign in again).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const response = await callWithAuth<ContactResponse>({
    method: "GET",
    path: `/marketplace/ads/${encodeURIComponent(slug)}/contact`,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok", contact: response.data.data });
  }
  if (response.status === 401) {
    return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
