import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/**
 * Forward one admin-taxonomy mutation to the API and surface its status + body verbatim — so a 422's
 * validation errors, a 403, or a 429's retry hint all reach the client. The API is the real
 * allow-list + super_admin gate; the BFF only proxies with the caller's token.
 */
export async function forwardTaxonomy(
  method: "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<NextResponse> {
  const response = await callWithAuth<Record<string, unknown>>({
    method,
    path,
    body,
  });

  if (response.status === 429) {
    return rateLimitedResponse(response);
  }

  return NextResponse.json(response.data ?? {}, { status: response.status });
}
