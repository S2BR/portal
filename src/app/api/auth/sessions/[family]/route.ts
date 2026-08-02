import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

/**
 * BFF: sign out a single device by its session (family) id. Scoped to the
 * caller by the api; an unknown or foreign session comes back as 404.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ family: string }> },
): Promise<NextResponse> {
  const { family } = await params;

  const response = await callWithAuth<ApiError>({
    method: "DELETE",
    path: `/account/security/sessions/${encodeURIComponent(family)}`,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok" });
  }

  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ status: "error" }, { status: 502 });
}
