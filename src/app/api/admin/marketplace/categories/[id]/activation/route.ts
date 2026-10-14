import type { NextResponse } from "next/server";

import { forwardMarketplaceAdmin } from "@/lib/marketplace/admin-forward";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return forwardMarketplaceAdmin(
    "PUT",
    `/admin/marketplace/categories/${encodeURIComponent(id)}/activation`,
    await request.json(),
  );
}
