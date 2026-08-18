import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";

import type { AdminBusinessOwner } from "@/app/api/admin/businesses/route";

/** BFF: detach an owner account from a business. Returns the updated owners. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
): Promise<NextResponse> {
  const { id, userId } = await params;

  const response = await callWithAuth<{ data: AdminBusinessOwner[] }>({
    method: "DELETE",
    path: `/admin/businesses/${encodeURIComponent(id)}/owners/${encodeURIComponent(userId)}`,
  });

  if (response.ok) {
    return NextResponse.json({ data: response.data.data });
  }
  return NextResponse.json(
    { message: "error" },
    { status: response.status === 403 ? 403 : 502 },
  );
}
