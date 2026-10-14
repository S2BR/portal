import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { AttributeOption } from "@/lib/marketplace/types";

/** BFF: vehicle makes for the market (unauthenticated) for the Make picker. */
export async function GET(request: Request): Promise<NextResponse> {
  const market = new URL(request.url).searchParams.get("market");
  const suffix = market ? `?market=${encodeURIComponent(market)}` : "";

  const response = await callWithAuth<{ data?: AttributeOption[] }>({
    method: "GET",
    path: `/marketplace/vehicle-makes${suffix}`,
  });

  return NextResponse.json({
    data: response.ok ? (response.data.data ?? []) : [],
  });
}
