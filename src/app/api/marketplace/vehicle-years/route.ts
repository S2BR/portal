import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { AttributeOption } from "@/lib/marketplace/types";

/** BFF: the selectable vehicle years (unauthenticated) for the Year picker. */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ data?: AttributeOption[] }>({
    method: "GET",
    path: "/marketplace/vehicle-years",
  });

  return NextResponse.json({
    data: response.ok ? (response.data.data ?? []) : [],
  });
}
