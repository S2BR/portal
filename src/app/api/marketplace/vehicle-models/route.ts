import { NextResponse } from "next/server";

import { portalFetch } from "@/lib/api/client";
import type { AttributeOption } from "@/lib/marketplace/types";

/** BFF: vehicle models for a make + year (unauthenticated), lazy-loaded server-side. */
export async function GET(request: Request): Promise<NextResponse> {
  const incoming = new URL(request.url).searchParams;
  const forwarded = new URLSearchParams();
  for (const key of ["make", "year", "market"] as const) {
    const value = incoming.get(key);
    if (value) {
      forwarded.set(key, value);
    }
  }
  const suffix = forwarded.toString();

  const response = await portalFetch<{ data?: AttributeOption[] }>({
    method: "GET",
    path: `/marketplace/vehicle-models${suffix ? `?${suffix}` : ""}`,
  });

  return NextResponse.json({
    data: response.ok ? (response.data.data ?? []) : [],
  });
}
