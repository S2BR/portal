import { NextResponse } from "next/server";

import { portalFetch } from "@/lib/api/client";

/**
 * BFF: hand the browser a short-lived, search-only scoped Typesense key (minted by the API's PUBLIC
 * endpoint, no login). Same-origin so there's no CORS; the browser then searches Typesense directly
 * with the returned key — Laravel stays out of the search hot path. The key is a ~15-min HMAC of the
 * server-only parent key; the client re-fetches here before it expires (or on a Typesense 401).
 */
export async function GET(): Promise<NextResponse> {
  const response = await portalFetch<{
    key?: string;
    host?: string;
    expires_at?: number;
  }>({ method: "POST", path: "/public/search/token" });

  if (!response.ok || !response.data.key) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  return NextResponse.json(
    {
      key: response.data.key,
      host: response.data.host,
      expires_at: response.data.expires_at,
    },
    // The key is short-lived and per-visitor-ish; never cache it at the edge.
    { headers: { "Cache-Control": "no-store" } },
  );
}
