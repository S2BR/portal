import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";

import type { AdminBusinessOwner } from "@/app/api/admin/businesses/route";

/** BFF: typeahead user lookup for assigning a business owner. */
export async function GET(request: Request): Promise<NextResponse> {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q === "") {
    return NextResponse.json({ data: [] });
  }

  const response = await callWithAuth<{ data: AdminBusinessOwner[] }>({
    method: "GET",
    path: `/admin/users?q=${encodeURIComponent(q)}`,
  });

  if (response.ok) {
    return NextResponse.json({ data: response.data.data });
  }
  return NextResponse.json(
    { data: [] },
    { status: response.status === 403 ? 403 : 502 },
  );
}
