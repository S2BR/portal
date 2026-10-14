import { NextResponse } from "next/server";

import { portalFetch } from "@/lib/api/client";

/** BFF: decode a VIN to vehicle field values (unauthenticated). Relays the API's 422 for a bad VIN. */
export async function GET(request: Request): Promise<NextResponse> {
  const vin = new URL(request.url).searchParams.get("vin")?.trim() ?? "";
  if (vin === "") {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await portalFetch<{ data?: Record<string, string> }>({
    method: "GET",
    path: `/marketplace/vehicle-vin?vin=${encodeURIComponent(vin)}`,
  });

  if (response.ok) {
    return NextResponse.json({ data: response.data.data ?? {} });
  }
  if (response.status === 422) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
