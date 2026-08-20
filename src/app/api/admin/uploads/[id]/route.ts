import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/**
 * BFF: delete an upload from the manager — the API purges its S3 object(s) and drops the ledger row,
 * enforcing the super_admin role (a 403 is surfaced here).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const response = await callWithAuth<{
    status?: string;
    message?: string;
    retry_after?: number | null;
  }>({
    method: "DELETE",
    path: `/admin/uploads/${encodeURIComponent(id)}`,
  });

  if (response.ok) {
    return NextResponse.json({ status: "deleted" });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  if (response.status === 404) {
    return NextResponse.json({ message: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ message: "error" }, { status: 502 });
}
