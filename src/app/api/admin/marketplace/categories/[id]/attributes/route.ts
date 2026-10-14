import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { AdminField } from "@/lib/marketplace/admin";
import { forwardMarketplaceAdmin } from "@/lib/marketplace/admin-forward";

/** BFF: a category's field definitions for the admin editor (includes deprecated). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const response = await callWithAuth<{ fields?: AdminField[] }>({
    method: "GET",
    path: `/admin/marketplace/categories/${encodeURIComponent(id)}/attributes`,
  });

  if (response.ok) {
    return NextResponse.json({ fields: response.data.fields ?? [] });
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ fields: [] }, { status: 502 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return forwardMarketplaceAdmin(
    "POST",
    `/admin/marketplace/categories/${encodeURIComponent(id)}/attributes`,
    await request.json(),
  );
}
