import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import {
  flattenResource,
  type JsonApiDocument,
  type UserAttributes,
} from "@/lib/api/types";

/**
 * BFF "current user" handler. Runs `callWithAuth`, so an expired access token is
 * transparently refreshed (and the rotated cookie re-set) here — which is why
 * the browser reads the user through this route rather than during a render.
 * The api returns the user as a JSON:API `users` resource, flattened here.
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<JsonApiDocument<UserAttributes>>({
    path: "/account",
  });

  if (response.ok) {
    return NextResponse.json({ user: flattenResource(response.data.data) });
  }

  return NextResponse.json({ user: null }, { status: 401 });
}
