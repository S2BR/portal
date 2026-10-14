import { NextResponse } from "next/server";

import { portalFetch } from "@/lib/api/client";
import type { AttributeOption } from "@/lib/marketplace/types";

/** BFF: the selectable vehicle years (unauthenticated) for the Year picker. */
export async function GET(): Promise<NextResponse> {
  const response = await portalFetch<{ data?: AttributeOption[] }>({
    method: "GET",
    path: "/marketplace/vehicle-years",
  });

  return NextResponse.json({
    data: response.ok ? (response.data.data ?? []) : [],
  });
}
