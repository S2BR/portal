import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";

/** A place resolved to structured address parts, ready to fill the address form. */
export interface PlaceAddress {
  address_1: string | null;
  apartment_suite: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * BFF: resolve a Google place id (from autocomplete) into a structured address via the API.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const response = await callWithAuth<{ address?: PlaceAddress }>({
    method: "GET",
    path: `/addresses/place/${encodeURIComponent(id)}`,
  });

  if (response.ok) {
    return NextResponse.json({ address: response.data.address });
  }

  return NextResponse.json({ status: "error" }, { status: 502 });
}
