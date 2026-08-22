import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { AdminAmenity } from "@/lib/taxonomy/admin";
import { forwardTaxonomy } from "@/lib/taxonomy/forward";

/** BFF: the full amenity tree for the admin editor (includes inactive nodes + category bindings). */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ amenities?: AdminAmenity[] }>({
    method: "GET",
    path: "/admin/amenities",
  });

  if (response.ok) {
    return NextResponse.json({ amenities: response.data.amenities ?? [] });
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ amenities: [] }, { status: 502 });
}

export async function POST(request: Request): Promise<NextResponse> {
  return forwardTaxonomy("POST", "/admin/amenities", await request.json());
}
