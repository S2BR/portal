import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";

import type { AdminBusinessOwner } from "@/app/api/admin/businesses/route";

/** BFF: attach an owner account to a business (claims it if unclaimed). Returns the updated owners. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { user_id?: number };

  const response = await callWithAuth<{
    data: AdminBusinessOwner[];
    message?: string;
  }>({
    method: "POST",
    path: `/admin/businesses/${encodeURIComponent(id)}/owners`,
    body: { user_id: body.user_id },
  });

  if (response.ok) {
    return NextResponse.json({ data: response.data.data });
  }
  return NextResponse.json(
    { message: response.data?.message ?? "error" },
    {
      status:
        response.status === 403 ? 403 : response.status === 422 ? 422 : 502,
    },
  );
}
