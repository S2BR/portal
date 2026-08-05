import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";

export interface AddressPrediction {
  place_id: string;
  description: string;
}

/**
 * BFF: proxy Google Places autocomplete through the API (the key stays server-side). A short or
 * empty query returns no suggestions without a round-trip; an upstream failure (e.g. an
 * unconfigured key) surfaces as an empty list with the upstream status so the field degrades
 * gracefully instead of erroring.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const query = new URL(request.url).searchParams.get("query")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const response = await callWithAuth<{ predictions?: AddressPrediction[] }>({
    method: "GET",
    path: `/addresses/autocomplete?query=${encodeURIComponent(query)}`,
  });

  if (response.ok) {
    return NextResponse.json({ predictions: response.data.predictions ?? [] });
  }

  return NextResponse.json(
    { predictions: [] },
    { status: response.status === 502 ? 502 : 200 },
  );
}
