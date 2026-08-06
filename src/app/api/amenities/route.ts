import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";

/**
 * An amenity node. A root ("group") carries its `amenities`; both groups and amenities carry the
 * `category_slugs` they're scoped to (empty = global), which drives the category filter.
 */
export interface Amenity {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  parent_id: number | null;
  category_slugs?: string[];
  amenities?: Amenity[];
}

/**
 * BFF: the active amenity groups (each with its amenities + category bindings) for the Amenities
 * tab, localized by the API. Degrades to an empty list on an upstream failure.
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ amenities?: Amenity[] }>({
    method: "GET",
    path: "/amenities",
  });

  if (response.ok) {
    return NextResponse.json({ amenities: response.data.amenities ?? [] });
  }

  return NextResponse.json({ amenities: [] }, { status: response.status });
}
